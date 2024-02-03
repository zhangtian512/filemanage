import {getPartialObject} from '../db/minio.js'
import store from '@/store'
import { File } from '@/db/pg.js'
import {composeObjects,presignedPutObject,removeObjects,fPutObject,listObjects,copyObject} from '@/db/minio.js'
import { chunkSize } from '@/config'
import ajaxRest from '@/http/ajaxRest.js'
import { makeDir,rmFile,rmDir,dirExists,readDirFiles } from '@/util/index.js'
import { PubSub } from '@/func/pubsub.js'
import fs from 'fs'
import path from 'path'

function downloadChunk(chunkStream, objectName, chunkIndex, chunkSize) {
  return new Promise(resolve => {
    getPartialObject(objectName, chunkIndex*chunkSize, chunkSize, (err, dataStream) => {
      if (err) {
        const msg = `getPartialObject chunk ${chunkIndex} err:${err}`
        console.log(msg)
        resolve(msg)
        return
      }
      dataStream.on('data', function(chunk) {
        chunkStream.write(chunk)
      })
      dataStream.on('end', function() {
        resolve(null)
      })
      dataStream.on('error', function(err) {
        const msg = `chunk ${chunkIndex} write stream err:${err}`
        console.log(msg)
        resolve(msg)
      })
    })
  })
}
function downloadChunkLocal(task, i, chunkSize, srcPath, dstPath) {
  const start = i * chunkSize;
  const end = start + chunkSize - 1
  // console.log('downloadChunkLocal:', start, end, srcPath, dstPath)
  const fs = require('fs')
  return new Promise(resolve => {
    
    // 创建可读流
    const readStream = fs.createReadStream(srcPath, { start, end })

    // 创建可写流
    const writeStream = fs.createWriteStream(dstPath)

    // 使用管道将数据从可读流传输到可写流
    readStream.pipe(writeStream)

    // 监听复制完成事件
    writeStream.on('finish', () => {
      const finishedChunkNum = task.finished_chunk_num+1
      store.commit('common/updateTaskProgress', {task_id:task.task_id,finished_chunk_num:finishedChunkNum})
      fs.renameSync(dstPath, `${dstPath}.finished`)
      resolve(null)
    })

    // 监听可能发生的错误
    writeStream.on('error', (err) => {
      console.error('文件复制失败：', err)
      writeStream.close()
      resolve(err)
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
function findUnFinishedChunkIndex(dirPath, chunkFileNames) {
  let unfinishedChunkIndexs = []
  const existsFileNames = fs.readdirSync(dirPath)
  if (existsFileNames.length > 0) {
    chunkFileNames.forEach(name => {
      if (!existsFileNames.find(item => {return path.join(dirPath,item) === `${name}.finished`})) {
        // 提取下标
        unfinishedChunkIndexs.push(parseInt(name.substring(name.lastIndexOf('.')+1)))
      }
    })
  }
  return unfinishedChunkIndexs
}
async function findFileInPg(fileId) {
  const res = await File.getById(fileId)
  if (res.code !== 0 || !res.data || !res.data[0]) return null
  return res.data[0]
}
async function findFileInPgByKey(fileKey) {
  const res = await File.getByKey(fileKey)
  if (res.code !== 0 || !res.data || !res.data[0]) return null
  return res.data[0]
}
function sliceFile(file, fileKey, chunkNum) {
  let chunkFiles = {}
  for (let i=0;i<chunkNum;i++) {
    const start = i*chunkSize
    const end = start+chunkSize
    const chunkFile = file.slice(start, end, file.type)
    const chunkFileName = `${fileKey}-${i}.chunk`
    chunkFiles[chunkFileName] = {
      name: chunkFileName,
      file: chunkFile,
      size: chunkFile.size,
      type: chunkFile.type
    }
  }
  return chunkFiles
}
async function sliceFileBySteam(filePath, fileKey, fileType, fileSize) {
  let chunkFiles = {}
  return new Promise(resolve => {
    const readStream = fs.createReadStream(filePath, {highWaterMark: chunkSize})
    let index = 0
    readStream.on('data', (chunk) => {
      const chunkFileName = `${fileKey}-${index}.chunk`
      chunkFiles[chunkFileName] = {
        name: chunkFileName,
        file: new Blob([chunk], { type: 'application/octet-stream' }),
        size: fileSize,
        type: fileType
      }
      index++
    })
    readStream.on('end', () => {
      readStream.close()
      resolve(chunkFiles)
    })
    
    readStream.on('error', (err) => {
      console.error('读取文件出错:', err)
      readStream.close()
      resolve(null)
    })
  })
}
async function checkFinishedChunk(chunkFileNames, fileName) {
  let unfinishedChunkNames = chunkFileNames
  const finishedChunks = await listObjects(fileName)
  if (finishedChunks.length>0) {
    unfinishedChunkNames = unfinishedChunkNames.filter(item => {
      return !finishedChunks.find(ele => {return ele.name === item})
    })
  }
  return unfinishedChunkNames
}
function uploadChunk(task, chunkFile, chunkFileName, url) {
  return new Promise(resolve => {
    // console.log(task.canceler)
    ajaxRest({
      url: url,
      method: 'PUT',
      data: chunkFile,
      timeout: 24*60*60*1000,
      canceler: task.canceler
    }).then(res => {
      const finishedChunkNum = task.finished_chunk_num+1
      store.commit('common/updateTaskProgress', {task_id:task.task_id,finished_chunk_num:finishedChunkNum})
      resolve({name:chunkFileName,result:'ok'})
    }).catch(err=>{
      console.log(chunkFileName, '上传失败:', err)
      if (err.message && err.message === 'canceled by user') resolve({name:chunkFileName,result:'canceled by user'})
      else resolve({name:chunkFileName,result:err})
    })
  })
}
function uploadChunkLocal(task, i, chunkSize, srcPath, dstPath) {
  const start = i * chunkSize;
  const end = start + chunkSize - 1
  // console.log('uploadChunkLocal:', start, end, srcPath, dstPath)
  const fs = require('fs')
  return new Promise(resolve => {
    
    // 创建可读流
    const readStream = fs.createReadStream(srcPath, { start, end })

    // 创建可写流
    const writeStream = fs.createWriteStream(dstPath)

    // 使用管道将数据从可读流传输到可写流
    readStream.pipe(writeStream)

    // 监听复制完成事件
    writeStream.on('finish', () => {
      const finishedChunkNum = task.finished_chunk_num+1
      store.commit('common/updateTaskProgress', {task_id:task.task_id,finished_chunk_num:finishedChunkNum})
      fs.renameSync(dstPath, `${dstPath}.finished`)
      resolve(null)
    })

    // 监听可能发生的错误
    writeStream.on('error', (err) => {
      console.error('文件复制失败：', err)
      writeStream.close()
      resolve(err)
    })
  })
}
async function compose(chunkFiles, dstFileName, dstFileType, md5=null) {
  // console.log('compose:',chunkFiles, dstFileName, dstFileType)
  return new Promise(async resolve => {
    const chunkFileNames = Object.keys(chunkFiles)
    let result = {}
    await composeObjects(chunkFileNames, dstFileName, dstFileType, md5).then(async res=>{
      result = {code:0,msg:'success'}
    }).catch(async err=>{
      result = {code:-1,msg:err}
    }).finally(()=>{
      removeObjects(chunkFileNames)
      resolve(result)
    })
  })
}
async function clearTaskChunk(task) {
  return new Promise(async resolve => {
    if (!task.file_db_key) return resolve()
    const chunks = await listObjects(task.file_db_key)
    if (chunks && chunks.length>0) {
      await removeObjects(chunks.map(item=>item.name))
    }
    setTimeout(() => {rmDir(path.join('./data',task.file_id))},1000)
    resolve()
  })
}
async function uploadFileLocal(task) {
  console.log('uploadFileLocal:', task)
  store.commit('common/updateTaskStatus', {task_id:task.task_id,status:'uploading'})
  const totalSize = task.file_size
  const fileId = task.file_id
  const fileDbKey = task.file_db_key
  console.log(`文件key:${fileDbKey},文件md5:${fileId},文件总大小:${totalSize},分片大小:${chunkSize},分片总数:${task.total_chunk_num}`)

  // 急速秒传
  const existsFiles = await readDirFiles('./data')
  console.log('existsFiles:', existsFiles)
  if (existsFiles.find(fileName => fileName === fileDbKey)) {
    console.log('========= 系统存在同md5文件,急速妙传 =========')
    store.commit('common/completeUploadTask', {task_id:task.task_id})
    PubSub.publish('upload', {id:task.task_id,status:'completed'})
    return
  }
  
  const dirPath = path.join('./data',task.file_id)
  console.log(dirPath)
  // 创建目录
  const dirExist = await dirExists(dirPath)
  // console.log('dirExist:', dirExist)
  if (!dirExist) {
    const makeRes = await makeDir(dirPath)
    if (makeRes) {
      store.commit('common/updateTaskStatus', {task_id:task.task_id,status:'error',err_msg:makeRes.toString()})
      PubSub.publish('upload', {id:task.task_id,status:'error',err:`:${makeRes.toString()}`})
      return
    }
  }
  // 读文件
  const dirFiles = await readDirFiles(dirPath)
  console.log('dirFiles:', dirFiles)
  // 判断未上传的分片
  let chunkFiles = []
  let unfinishedChunks = []
  for (let i=0;i<task.total_chunk_num;i++) {
    chunkFiles.push({
      index: i,
      name: `${task.file_id}-${i}.chunk`
    })
  }
  unfinishedChunks = chunkFiles.filter(item => {
    return !dirFiles.find(fileName => {
      // console.log(fileName, item.name)
      return fileName === `${item.name}.finished`
    })
  })
  let chunkUploadFinished = true
  console.log('未上传分片:', unfinishedChunks)
  console.log(`总分片数:${task.total_chunk_num},未上传的分片数:${unfinishedChunks.length}`)
  // 开始上传
  if (unfinishedChunks.length > 0) {
    if (unfinishedChunks.length !== task.total_chunk_num) console.log('@@@@@@@@@ 断点续传 @@@@@@@@@')
    const finishedChunkNum = task.total_chunk_num-unfinishedChunks.length
    store.commit('common/updateTaskProgress', {task_id:task.task_id,finished_chunk_num:finishedChunkNum})

    for (const chunkFile of unfinishedChunks) {
      console.log('task.status:', task.status)
      if (task.status === 'pause' || task.status === 'cancel') {
        console.log('canceled by user:', task.status)
        if (task.status === 'cancel') setTimeout(() => {rmDir(dirPath)},1000)
        return
      }
      const err = await uploadChunkLocal(task, chunkFile.index, chunkSize, task.file_path, path.join(dirPath,chunkFile.name))
      if (err) {
        chunkUploadFinished = false
        break
      }
    }
  }
  let uploadResult = 'completed'
  let dstFileName = path.join('./data', task.file_db_key)
  if (unfinishedChunks.length>0) {
    if (!chunkUploadFinished) uploadResult = '分片文件上传失败'
    else {
      console.log('========= 合并文件 =========')
      store.commit('common/updateTaskStatus', {task_id:task.task_id,status:'composing'})
      let dstStream = fs.createWriteStream(dstFileName)
      for (const chunkFile of chunkFiles) {
        const err = await mergeChunk(dstStream, path.join(dirPath,`${chunkFile.name}.finished`))
        if (err) {
          uploadResult = err
          break
        }
      }
      console.log('删除chunkFile和文件夹')
      setTimeout(() => {
        rmDir(dirPath)
        dstStream.close()
      },1000)
    }
  }
  
  console.log('========= 上传结束 =========')
  if (uploadResult === 'completed') {
    store.commit('common/completeUploadTask', {task_id:task.task_id})
    PubSub.publish('upload', {id:task.task_id,status:'completed'})
  } else {
    setTimeout(() => {
      fs.unlinkSync(dstFileName)
    },1000)
    store.commit('common/updateTaskStatus', {task_id:task.task_id,status:'error',err_msg:uploadResult.toString()})
    PubSub.publish('upload', {id:task.task_id,status:'error',err:`:${uploadResult.toString()}`})
  }
}

async function uploadFile(task) {
  console.log('uploadFile:', task)
  store.commit('common/updateTaskStatus', {task_id:task.task_id,status:'uploading'})
  const totalSize = task.file_size
  const fileId = task.file_id
  const fileDbKey = task.file_db_key
  console.log(`文件key:${fileDbKey},文件md5:${fileId},文件总大小:${totalSize},分片大小:${chunkSize},分片总数:${task.total_chunk_num}`)

  console.log('========= 校验md5 =========')
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

  let chunkUploadFinished = true
  let chunkFiles = {}
  chunkFiles = await sliceFileBySteam(task.file_path,fileDbKey,task.file_type,task.file_size)
  console.log('sliceFileBySteam:', chunkFiles)
  const unfinishedChunkNames = await checkFinishedChunk(Object.keys(chunkFiles), fileDbKey)
  console.log('未上传分片:', unfinishedChunkNames)
  console.log(`总分片数:${task.total_chunk_num},未上传的分片数:${unfinishedChunkNames.length}`)
  if (unfinishedChunkNames.length > 0) {
    if (unfinishedChunkNames.length !== task.total_chunk_num) console.log('@@@@@@@@@ 断点续传 @@@@@@@@@')
    const finishedChunkNum = task.total_chunk_num-unfinishedChunkNames.length
    store.commit('common/updateTaskProgress', {task_id:task.task_id,finished_chunk_num:finishedChunkNum})

    for (const chunkFileName of unfinishedChunkNames) {
      const url = await presignedPutObject(chunkFileName)
      const res = await uploadChunk(task,chunkFiles[chunkFileName].file,chunkFileName,url)
      if (res.result !== 'ok') {
        // 如果是手动取消或暂停的，直接跳出函数
        if (res.result === 'canceled by user') return
        else {
          chunkUploadFinished = false
          break
        }
      }
    }
  }

  let uploadResult = 'completed'
  if (Object.keys(chunkFiles).length>0) {
    if (!chunkUploadFinished) uploadResult = '分片文件上传失败'
    else {
      console.log('========= 合并文件 =========')
      store.commit('common/updateTaskStatus', {task_id:task.task_id,status:'composing'})
      const composeRes = await compose(chunkFiles, fileDbKey, task.file_type, fileId)
      if (composeRes.code !== 0) uploadResult = `合并文件失败${composeRes.msg}`
    }
  }
  
  console.log('========= 上传结束 =========')
  if (uploadResult === 'completed') {
    store.commit('common/completeUploadTask', {task_id:task.task_id})
    PubSub.publish('upload', {id:task.task_id,status:'completed'})
  } else {
    store.commit('common/updateTaskStatus', {task_id:task.task_id,status:'error',err_msg:uploadResult.toString()})
    PubSub.publish('upload', {id:task.task_id,status:'error',err:`:${uploadResult.toString()}`})
  }

  
}
async function downloadFile(task,chunkSize=10*1024*1024) {
  console.log('downloadFile:', task)
  // 开始下载
  // 创建存放chunk的文件夹
  const tempDir = path.join(task.target_path,task.file_db_key)
  let err = await makeDir(tempDir)
  if (err) {
    store.commit('common/updateTaskStatus', {task_id:task.task_id,status:'error',err_msg:err.toString()})
    PubSub.publish('download', {id:task.task_id,status:'error',err:err.toString()})
    return
  }

  console.log('========= 开始下载 =========')
  store.commit('common/updateTaskStatus', {task_id:task.task_id,status:'downloading'})
  let doneNum = 0
  let chunkFilaNames = []
  for (let i=0;i<task.total_chunk_num;i++) {
    chunkFilaNames.push(path.join(tempDir, `${task.file_name}.chunk.${i}`))
  }
  const unFinishedChunkIndexs = findUnFinishedChunkIndex(tempDir, chunkFilaNames)
  console.log(`总分片数:${task.total_chunk_num},未下载的分片:${unFinishedChunkIndexs}`)
  if (unFinishedChunkIndexs.length > 0 && unFinishedChunkIndexs.length !== task.total_chunk_num) {
    console.log('========= 断点续传 =========')
    const finishedChunkNum = task.total_chunk_num-unFinishedChunkIndexs.length
    doneNum = finishedChunkNum
    store.commit('common/updateTaskProgress', {task_id:task.task_id,finished_chunk_num:finishedChunkNum})
  }
  let downloadChunkErr = null
  for (let i=0;i<task.total_chunk_num;i++) {
    const chunkFilaName = chunkFilaNames[i]
    if (unFinishedChunkIndexs.length>0 && !unFinishedChunkIndexs.includes(i)) {
      console.log(chunkFilaName, '已经下载完成 略过')
      continue
    }
    console.log('========= 开始下载chunk =========', chunkFilaName)
    const chunkStream = fs.createWriteStream(chunkFilaName)
    if (task.canceler) {
      console.log('========= 暂停下载 =========', task.canceler)
      setTimeout(() => { chunkStream.close() },1000)
      // 如果是取消则删除整个文件夹
      if (task.canceler === 'paused by user') setTimeout(() => {rmFile(chunkFilaName)},1000)
      if (task.canceler === 'canceled by user') setTimeout(() => {rmDir(tempDir)},1000)
      store.commit('common/setCanceler', {task_id:task.task_id,canceler:null})
      return
    }
    const err = await downloadChunk(chunkStream, task.file_db_key, i, chunkSize)
    if (err) {
      downloadChunkErr = err
      setTimeout(() => { chunkStream.close() },1000)
      break
    }
    doneNum++
    setTimeout(() => { chunkStream.close() },1000)
    // 完成后重命名 方便断点下载检查chunk文件完整性
    fs.renameSync(chunkFilaName, `${chunkFilaName}.finished`)
    store.commit('common/updateTaskProgress', {task_id:task.task_id,finished_chunk_num:doneNum})
  }
  if (downloadChunkErr) {
    store.commit('common/updateTaskStatus', {task_id:task.task_id,status:'pause',err_msg:downloadChunkErr.toString()})
    PubSub.publish('download', {id:task.task_id,status:'pause',err:downloadChunkErr.toString()})
    // 删除未完成的chunk
    for (const name of chunkFilaNames) rmFile(name)
    return
  }

  console.log('========= 合并文件 =========')
  // 创建文件存放合并后的结果stream
  store.commit('common/updateTaskStatus', {task_id:task.task_id,status:'composing'})
  let dstStream = fs.createWriteStream(path.join(task.target_path, task.file_name))
  let composeChunkErr = null
  for (const chunkFilaName of chunkFilaNames) {
    const err = await mergeChunk(dstStream, `${chunkFilaName}.finished`)
    if (err) {
      composeChunkErr = err
      break
    }
  }
  if (composeChunkErr) {
    console.log('合并失败:', composeChunkErr)
    store.commit('common/updateTaskStatus', {task_id:task.task_id,status:'error',err_msg:composeChunkErr.toString()})
    PubSub.publish('download', {id:task.task_id,status:'error',err:composeChunkErr.toString()})
  } else {
    store.commit('common/completeUploadTask', {task_id:task.task_id})
    PubSub.publish('download', {id:task.task_id,status:'completed'})
  }
  console.log('删除chunkFile和文件夹')
  setTimeout(() => {
    rmDir(tempDir)
    dstStream.close()
  },1000)
}

async function downloadFileLocal(task,chunkSize=10*1024*1024) {
  console.log('downloadFileLocal:', task)
  // 开始下载
  // 创建存放chunk的文件夹
  const tempDir = path.join(task.target_path,task.file_id)
  let err = await makeDir(tempDir)
  if (err) {
    store.commit('common/updateTaskStatus', {task_id:task.task_id,status:'error',err_msg:err.toString()})
    PubSub.publish('download', {id:task.task_id,status:'error',err:err.toString()})
    return
  }

  console.log('========= 开始下载 =========')
  store.commit('common/updateTaskStatus', {task_id:task.task_id,status:'downloading'})
  const dirFiles = await readDirFiles(tempDir)
  console.log('dirFiles:', dirFiles)
  let chunkFiles = []
  let unfinishedChunks = []
  for (let i=0;i<task.total_chunk_num;i++) {
    chunkFiles.push({
      index: i,
      name: `${task.file_id}-${i}.chunk`
    })
  }
  unfinishedChunks = chunkFiles.filter(item => {
    return !dirFiles.find(fileName => {
      // console.log(fileName, item.name)
      return fileName === `${item.name}.finished`
    })
  })
  console.log('未下载分片:', unfinishedChunks)
  console.log(`总分片数:${task.total_chunk_num},未下载的分片数:${unfinishedChunks.length}`)
  if (unfinishedChunks.length > 0 && unfinishedChunks.length !== task.total_chunk_num) {
    console.log('========= 断点续传 =========')
    const finishedChunkNum = task.total_chunk_num-unfinishedChunks.length
    store.commit('common/updateTaskProgress', {task_id:task.task_id,finished_chunk_num:finishedChunkNum})
  }
  let downloadChunkErr = null
  for (const chunkFile of unfinishedChunks) {
    console.log('task.status:', task.status)
    if (task.status === 'pause' || task.status === 'cancel') {
      console.log('task.canceler:', task.canceler)
      if (task.canceler === 'canceled by user') setTimeout(() => {rmDir(tempDir)},1000)
      store.commit('common/setCanceler', {task_id:task.task_id,canceler:null})
      return
    }
    const err = await downloadChunkLocal(task, chunkFile.index, chunkSize, path.join('./data',task.file_db_key), path.join(tempDir,chunkFile.name))
    if (err) {
      downloadChunkErr = err
      break
    }
  }
  if (downloadChunkErr) {
    store.commit('common/updateTaskStatus', {task_id:task.task_id,status:'pause',err_msg:downloadChunkErr.toString()})
    PubSub.publish('download', {id:task.task_id,status:'pause',err:downloadChunkErr.toString()})
    // 删除未完成的chunk
    return
  }

  console.log('========= 合并文件 =========')
  let dstFileName = path.join(task.target_path, task.file_name)
  // 创建文件存放合并后的结果stream
  store.commit('common/updateTaskStatus', {task_id:task.task_id,status:'composing'})
  let dstStream = fs.createWriteStream(dstFileName)
  let composeChunkErr = null
  for (const chunkFile of chunkFiles) {
    const err = await mergeChunk(dstStream, path.join(tempDir,`${chunkFile.name}.finished`))
    if (err) {
      composeChunkErr = err
      break
    }
  }
  console.log('删除chunkFile和文件夹')
  setTimeout(() => {
    rmDir(tempDir)
    dstStream.close()
  },1000)
  if (composeChunkErr) {
    console.log('合并失败:', composeChunkErr)
    setTimeout(() => {
      fs.unlinkSync(dstFileName)
    },1000)
    store.commit('common/updateTaskStatus', {task_id:task.task_id,status:'error',err_msg:composeChunkErr.toString()})
    PubSub.publish('download', {id:task.task_id,status:'error',err:composeChunkErr.toString()})
  } else {
    store.commit('common/completeUploadTask', {task_id:task.task_id})
    PubSub.publish('download', {id:task.task_id,status:'completed'})
  }
}

export {
  downloadFileLocal,
  downloadFile,
  uploadFileLocal,
  uploadFile,
  clearTaskChunk,
  findFileInPg,
  findFileInPgByKey
}