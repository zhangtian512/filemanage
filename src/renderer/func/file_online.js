import {getPartialObject} from '../db/minio.js'
import store from '@/store'
import { File } from '@/db/pg.js'
import {composeObjects,presignedPutObject,removeObjects,fPutObject,listObjects,copyObject,putObject} from '@/db/minio.js'
import { chunkSize } from '@/config'
import ajaxRest from '@/http/ajaxRest.js'
import { makeDir,rmFile,rmDir,dirExists,readDirFiles } from '@/util/index.js'
import { PubSub } from '@/func/pubsub.js'
import fs from 'fs'
import path from 'path'

/*** 上传文件 ***/
async function uploadFile(task) {
  console.log('uploadFile:', task)
  store.commit('common/updateTaskStatus', {task_id:task.task_id,status:'uploading'})
  const totalSize = task.file_size
  const fileId = task.file_id
  const fileDbKey = task.file_db_key
  console.log(`文件key:${fileDbKey},文件md5:${fileId},文件总大小:${totalSize},分片大小:${chunkSize},分片总数:${task.total_chunk_num}`)

  console.log('========= 校验是否存在同md5文件 =========')
  const minioObjs = await listObjects(fileId)
  console.log('minioObjs:', minioObjs)
  if (minioObjs && minioObjs.length > 0) {
    const existObj = minioObjs.find(item=>!item.name.includes('.chunk'))
    if (existObj) {
      console.log('existObj:', existObj)
      console.log('========= 系统存在同md5文件,急速妙传 =========')
      store.commit('common/completeUploadTask', {task_id:task.task_id})
      PubSub.publish('upload', {id:task.task_id,status:'completed'})
      return
    }
  }

  console.log('========= 文件分片 =========')
  if (totalSize <= chunkSize) {
    console.log('@@@@@@@@@ 不需要分片,直接上传 @@@@@@@@@')
    await fPutObject(task.file_path, task.file_size, fileDbKey, task.file_type).then(async res => {
      store.commit('common/completeUploadTask', {task_id:task.task_id})
      PubSub.publish('upload', {id:task.task_id,status:'completed'})
    }).catch(async err => {
      store.commit('common/updateTaskStatus', {task_id:task.task_id,status:'error',err_msg:err.toString()})
      PubSub.publish('upload', {id:task.task_id,status:'error',err:`fPutObject err:${err.toString()}`})
    })
    return
  }

  console.log('========= 检查已上传分片 =========')
  const {originChunks,unfinishedChunks} = await checkUnFinishedUploadChunk(task)
  const totalChunkNum = originChunks.length
  const unFinishedNum = unfinishedChunks.length
  const finishedChunkNum = totalChunkNum-unFinishedNum
  console.log('未上传分片:', unfinishedChunks)
  console.log(`总分片数:${totalChunkNum},未上传的分片数:${unFinishedNum}`)
  if (unFinishedNum !== totalChunkNum) console.log('@@@@@@@@@ 断点续传 @@@@@@@@@')
  store.commit('common/updateTaskProgress', {task_id:task.task_id,finished_chunk_num:finishedChunkNum})

  for (const chunk of unfinishedChunks) {
    // console.log('task.status:',task.status)
    if (task.status === 'pause' || task.status === 'cancel') return
    const err = await uploadChunk(task, chunk, chunkSize)
    if (err) {
      store.commit('common/updateTaskStatus', {task_id:task.task_id,status:'error',err_msg:`上传分片失败:${err.toString()}`})
      PubSub.publish('upload', {id:task.task_id,status:'error',err:`上传分片失败:${err.toString()}`})
      return
    }
    store.commit('common/updateTaskProgress', {task_id:task.task_id,finished_chunk_num:task.finished_chunk_num+1})
  }

  console.log('========= 合并文件 =========')
  store.commit('common/updateTaskStatus', {task_id:task.task_id,status:'composing'})
  const composeErr = await composeUploadChunk(originChunks.map(item=>item.name), fileDbKey, task.file_type, fileId)
  if (composeErr) {
    store.commit('common/updateTaskStatus', {task_id:task.task_id,status:'error',err_msg:`合并文件失败:${composeErr.toString()}`})
    PubSub.publish('upload', {id:task.task_id,status:'error',err:`合并文件失败:${composeErr.toString()}`})
    return
  }

  console.log('========= 清除chunk文件 =========')
  clearUploadTaskChunk(task)
  
  console.log('========= 上传完成 =========')
  store.commit('common/completeUploadTask', {task_id:task.task_id})
  PubSub.publish('upload', {id:task.task_id,status:'completed'})
}
async function checkUnFinishedUploadChunk(task) {
  const existChunks = await listObjects(`${task.file_id}.chunk`)
  console.log('existChunks:', existChunks)
  // 过滤无效chunk
  let i = 0
  const validChunks = existChunks.filter(item => {
    const fileName = item.name
    const arr = fileName.split('.')
    if (arr.length === 0) return false
    const suffix = arr[arr.length-1]
    if (isNaN(Number(suffix))) return false
    // 非最后一片chunk大小肯定是chunkSize
    if (i !== task.total_chunk_num-1 && item.size !== chunkSize) return false
    i++
    return true
  })
  // console.log('validChunks:', validChunks)
  // 获取已经上传成功的chunk
  const finishedChunks = validChunks.map(item => {
    const fileName = item.name
    const arr = fileName.split('.')
    const index = arr[arr.length-1]
    item.index = Number(index)
    return item
  })
  // console.log('finishedChunks:', finishedChunks)
  // 计算unfinishedChunks
  let originChunks = []
  for (let i=0;i<task.total_chunk_num;i++) {
    originChunks.push({
      index: i,
      name: `${task.file_id}.chunk.${i}`
    })
  }
  const unfinishedChunks = originChunks.filter(origin => {
    return !finishedChunks.find(finish => finish.index === origin.index)
  })
  return {originChunks,unfinishedChunks}
}
async function uploadChunk(task, chunk) {
  let err = null
  const fs = require('fs')
  const index = chunk.index
  const start = index * chunkSize;
  const end = start + chunkSize - 1
  // console.log('uploadChunk:', chunk, start, end)
  // 创建临时文件夹
  const tempDir = '.temp'
  const dirExist = await dirExists(tempDir)
  if (!dirExist) {
    err = await makeDir(tempDir)
    if (err) return err
  }
  const srcPath = task.file_path
  const dstPath = path.join(tempDir, `${task.file_id}.chunk.${index}`)
  return new Promise(async resolve => {
    // // 创建可读流
    // const readStream = fs.createReadStream(srcPath, { start, end })
    // // 创建可写流
    // const writeStream = fs.createWriteStream(dstPath)
    // // 使用管道将数据从可读流传输到可写流
    // readStream.pipe(writeStream)
    // // 监听复制完成事件
    // writeStream.on('finish', async () => {
    //   const url = await presignedPutObject(chunk.name)
    //   err = await uploadFileByUrl(dstPath, url)
    //   if (err) {
    //     resolve(err)
    //     return
    //   }
    //   setTimeout(() => { fs.unlinkSync(dstPath) }, 1000)
    //   resolve(null)
    // })
    // // 监听可能发生的错误
    // writeStream.on('error', (err) => {
    //   console.error('文件复制失败：', err)
    //   writeStream.close()
    //   setTimeout(() => { fs.unlinkSync(dstPath) }, 1000)
    //   resolve(err)
    // })

    const readStream = fs.createReadStream(srcPath, { start, end, highWaterMark: chunkSize })
    readStream.on('data', async stream => {
      err = await putObject(`${task.file_id}.chunk.${index}`, stream, chunkSize)
      if (err) resolve(err)
      else resolve(null)
    })
    readStream.on('end', () => {
      readStream.close()
    })
    
    readStream.on('error', (err) => {
      console.error('读取文件:',chunk, '出错:', err)
      readStream.close()
      resolve(err)
    })
  })
}
async function composeUploadChunk(chunkNames, dstFileName, dstFileType, md5=null) {
  // console.log('composeUploadChunk:',chunkNames, dstFileName, dstFileType, md5)
  return new Promise(async resolve => {
    let res = null
    await composeObjects(chunkNames, dstFileName, dstFileType, md5).then(async res=>{
    }).catch(async err=>{
      res = err
    }).finally(()=>{
      resolve(res)
    })
  })
}
async function clearUploadTaskChunk(task) {
  return new Promise(async resolve => {
    if (!task.file_id) return resolve()
    const chunks = await listObjects(`${task.file_id}.chunk`)
    if (chunks && chunks.length>0) {
      let index = 0
      let chunkNames = []
      while (true) {
        chunkNames = chunks.slice(index, index+1000).map(item=>item.name)
        if (chunkNames.length === 0) break
        await removeObjects(chunkNames)
        index += 1000
      }
    }
    resolve()
  })
}
/*** 上传文件 ***/
/*** 下载文件 ***/
async function downloadFile(task) {
  console.log('downloadFile:', task)
  store.commit('common/updateTaskStatus', {task_id:task.task_id,status:'downloading'})
  // 创建存放chunk的文件夹
  const tempDir = path.join(task.target_path,task.file_id)
  let err = await makeDir(tempDir)
  if (err) {
    store.commit('common/updateTaskStatus', {task_id:task.task_id,status:'error',err_msg:err.toString()})
    PubSub.publish('download', {id:task.task_id,status:'error',err:err.toString()})
    return
  }
  
  console.log('========= 检查已下载分片 =========')
  const {originChunks,unfinishedChunks} = await checkUnFinishedDownloadChunk(task, tempDir)
  const totalChunkNum = originChunks.length
  const unFinishedNum = unfinishedChunks.length
  const finishedChunkNum = totalChunkNum-unFinishedNum
  console.log('未下载分片:', unfinishedChunks)
  console.log(`总分片数:${totalChunkNum},未下载的分片数:${unFinishedNum}`)
  if (unFinishedNum !== totalChunkNum) {
    console.log('========= 断点续传 =========')
    store.commit('common/updateTaskProgress', {task_id:task.task_id,finished_chunk_num:finishedChunkNum})
  }

  for (const chunkFile of unfinishedChunks) {
    // console.log('task.status:', task.status)
    if (task.status === 'pause' || task.status === 'cancel') {
      console.log('task.canceler:', task.canceler)
      if (task.canceler === 'canceled by user')
      store.commit('common/setCanceler', {task_id:task.task_id,canceler:null})
      return
    }
    const dstFilePath = path.join(tempDir,chunkFile.name)
    const err = await downloadChunk(task.file_db_key, chunkFile.index, dstFilePath)
    if (err) {
      fs.unlinkSync(dstFilePath)
      store.commit('common/updateTaskStatus', {task_id:task.task_id,status:'error',err_msg:`下载分片失败:${err.toString()}`})
      PubSub.publish('download', {id:task.task_id,status:'error',err:`下载分片失败:${err.toString()}`})
      return
    }
    store.commit('common/updateTaskProgress', {task_id:task.task_id,finished_chunk_num:task.finished_chunk_num+1})
  }

  console.log('========= 合并文件 =========')
  store.commit('common/updateTaskStatus', {task_id:task.task_id,status:'composing'})
  const dstFileName = path.join(task.target_path, task.file_name)
  let dstStream = fs.createWriteStream(dstFileName)
  for (const chunkFile of originChunks) {
    const err = await mergeChunk(dstStream, path.join(tempDir,`${chunkFile.name}.finished`))
    if (err) {
      dstStream.close()
      setTimeout(() => {
        fs.unlinkSync(dstFileName)
      },1000)
      store.commit('common/updateTaskStatus', {task_id:task.task_id,status:'error',err_msg:`合并文件失败:${err.toString()}`})
      PubSub.publish('download', {id:task.task_id,status:'error',err:`合并文件失败:${err.toString()}`})
      return
    }
  }

  console.log('========= 删除临时文件夹 =========')
  setTimeout(() => {
    rmDir(tempDir)
    dstStream.close()
  },1000)
  store.commit('common/completeUploadTask', {task_id:task.task_id})
  PubSub.publish('download', {id:task.task_id,status:'completed'})
}
async function checkUnFinishedDownloadChunk(task, tempDir) {
  const dirFiles = await readDirFiles(tempDir)
  console.log('dirFiles:', dirFiles)
  // 过滤无效chunk
  let i = 0
  const validChunks = dirFiles.filter(fileName => {
    const arr = fileName.split('.')
    if (arr.length < 3) return false
    const finished = arr[arr.length-1]
    if (finished !== 'finished') return false
    const suffix = arr[arr.length-2]
    if (isNaN(Number(suffix))) return false
    // 非最后一片chunk大小肯定是chunkSize
    const stat = fs.statSync(path.join(tempDir, fileName))
    if (i !== task.total_chunk_num-1 && stat.size !== chunkSize) return false
    i++
    return true
  })
  // console.log('validChunks:', validChunks)
  // 获取已经上传成功的chunk
  const finishedChunks = validChunks.map(fileName => {
    const arr = fileName.split('.')
    const index = arr[arr.length-2]
    return {
      name: fileName,
      index: Number(index)
    }
  })
  // console.log('finishedChunks:', finishedChunks)
  // 计算unfinishedChunks
  let originChunks = []
  for (let i=0;i<task.total_chunk_num;i++) {
    originChunks.push({
      index: i,
      name: `${task.file_id}.chunk.${i}`
    })
  }
  const unfinishedChunks = originChunks.filter(origin => {
    return !finishedChunks.find(finish => finish.index === origin.index)
  })
  console.log('originChunks:', originChunks)
  console.log('unfinishedChunks:', unfinishedChunks)
  return {originChunks,unfinishedChunks}
}
function downloadChunk(objectName, chunkIndex, dstPath) {
  return new Promise(resolve => {
    const writeStream = fs.createWriteStream(dstPath)
    getPartialObject(objectName, chunkIndex*chunkSize, chunkSize, (err, dataStream) => {
      if (err) {
        const msg = `getPartialObject chunk ${chunkIndex} err:${err}`
        console.log(msg)
        resolve(msg)
        return
      }
      dataStream.pipe(writeStream)
      dataStream.on('end', function() {
        fs.renameSync(dstPath, `${dstPath}.finished`)
        writeStream.close()
        resolve(null)
      })
      dataStream.on('error', function(err) {
        const msg = `chunk ${chunkIndex} write stream err:${err}`
        console.log(msg)
        writeStream.close()
        resolve(msg)
      })
    })
  })
}
function mergeChunk(dstStream, chunkFileName) {
  return new Promise(resolve => {
    const readStream = fs.createReadStream(chunkFileName)
    readStream.pipe(dstStream, {end: false})
    readStream.on('end', () => {
      console.log('merge ',chunkFileName,'结束')
      readStream.close()
      resolve(null)
    })
    readStream.on('error', err => {
      console.log('mergeChunk fail:', err)
      readStream.close()
      resolve(err)
    })
  })
}
async function clearDownloadTaskChunk(task) {
  // 临时文件夹
  rmDir(path.join(task.target_path,task.file_id))
}
/*** 下载文件 ***/



export {
  uploadFile,
  clearUploadTaskChunk,
  downloadFile,
  clearDownloadTaskChunk
}