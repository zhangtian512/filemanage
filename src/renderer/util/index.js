import SparkMD5 from 'spark-md5'
import {saveAs} from 'file-saver'
import { errLog } from '../db/log.js'
// import fs from 'fs'
// import path from 'path'

function fmtDate (inputDate, fmt='YYYY-mm-dd HH:MM:SS') {
  if (!inputDate) {
    return ""
  }
  let ret
  let date = new Date(inputDate)
  const opt = {
      "Y+": date.getFullYear().toString(),        // 年
      "m+": (date.getMonth() + 1).toString(),     // 月
      "d+": date.getDate().toString(),            // 日
      "H+": date.getHours().toString(),           // 时
      "M+": date.getMinutes().toString(),         // 分
      "S+": date.getSeconds().toString()          // 秒
      // 有其他格式化字符需求可以继续添加，必须转化成字符串
  };
  for (let k in opt) {
      ret = new RegExp("(" + k + ")").exec(fmt);
      if (ret) {
          fmt = fmt.replace(ret[1], (ret[1].length == 1) ? (opt[k]) : (opt[k].padStart(ret[1].length, "0")))
      }
  }
  return fmt
}

/**
 * HH:MM:SS格式转为秒
 */
function timeToTs(time) {
  const arr = time.split(':')
  if (!time || arr.length !== 3) return 0
  var hour = arr[0]
  var min = arr[1]
  var sec = arr[2]
  return Number(hour*3600) + Number(min*60) + Number(sec)
}

function fileMD5(filePath) {
  console.log('fileMD5:', filePath)
  return new Promise(resolve=>{
    const fs = require('fs')
    const spark=new SparkMD5.ArrayBuffer()
    const stream = fs.createReadStream(filePath)
    stream.on('data', chunk => {
      spark.append(chunk)
    })
    stream.on('end', () => {
      var md5 = spark.end()
      resolve({md5:md5})
    })
    stream.on('error', err => {
      console.log('compute md5 fail:', err)
      resolve({err:err})
    })
  })
}

function isFileExists(path) {
  const fs = require('fs')
  return fs.existsSync(path)
}

function statFile(path) {
  const fs = require('fs')
  return fs.statSync(path)
}

function readFileByPath(path, fileName, fileType) {
  console.log('readFileByPath:',path, fileName, fileType)
  return new Promise(resolve => {
    const fs = require('fs')
    fs.readFile(path, (err,data) => {
      if (err) {
        errLog(err.stack)
        console.log(err)
        resolve(null)
      } else {
        if (data) {
          const file = new File([data], fileName, {type:fileType})
          resolve(file)
        }
        else resolve(null)
      }
    })
  })
}

function readDirFiles(path) {
  return new Promise(resolve => {
    const fs = require('fs')
    fs.readdir(path, (err, files) => {
      if (err) {
        console.log(err)
        errLog(err.stack)
        resolve([])
      } else resolve(files)
    })
  })
}

function dirExists(path) {
  const fs = require('fs')
  return new Promise(resolve => {
    fs.stat(path, (err, stats) => {
      if (err) {
        resolve(false)
      } else {
        if (stats.isDirectory()) resolve(true)
        else resolve(false)
      }
    })
  })
  
}

function makeDir(path) {
  return new Promise(resolve => {
    const fs = require('fs')
    if (fs.existsSync(path)) return resolve(null)
    fs.mkdir(path, { recursive:true }, err => {
      if (err) {
        console.log(err)
        errLog(err.stack)
        resolve(err)
      } else {
        resolve(null)
      }
    })
  })
}

function rmFile(path) {
  const fs = require('fs')
  try {
    fs.unlinkSync(path)
    // console.log('删除文件成功:', path)
  } catch (err) {
    console.log('删除文件失败:', err)
  }
}

function rmDir(dirPath) {
  console.log('rmDir:', dirPath)
  const fs = require('fs')
  const path = require('path')
  try {
    //判断文件夹是否存在
    if (fs.existsSync(dirPath)) {
      //读取文件夹下的文件目录，以数组形式输出
      fs.readdirSync(dirPath).forEach(file => {
        const curPath = path.join(dirPath, file)
        //判断是不是文件夹，如果是，继续递归
        if (fs.lstatSync(curPath).isDirectory()) rmDir(curPath)
        //删除文件或文件夹
        else fs.unlinkSync(curPath)
        // console.log('删除文件成功:', curPath)
      })
      //仅可用于删除空目录
      setTimeout(() => {
        // console.log('删除文件夹')
        fs.rmdirSync(dirPath)
      }, 1000)
    }
  } catch (err) {
    console.log('删除文件夹失败:', err)
  }
}

function saveFileAs(file, fileName) {
  saveAs(file, fileName)
}

function listToTree(list, config={id:'id',children:'children',pid:'pid'}) {
  const conf = config
  const nodeMap = new Map()
  let result = []
  const { id, children, pid } = conf

  for (const node of list) {
    node[children] = node[children] || []
    nodeMap.set(node[id], node)
  }
  for (const node of list) {
    const parent = nodeMap.get(node[pid])
    ;(parent ? parent.children : result).push(node)
  }
  return result
}

function calcFileSize(size) {
  if (size < 1024) return `${(size/1024).toFixed(1)}KB`
  if (size/1024 >= 1 && size/1024 < 1024) return `${(size/1024).toFixed(1)}KB`
  if (size/1024/1024 >= 1 && size/1024/1024 < 1024) return `${(size/1024/1024).toFixed(1)}MB`
  return `${(size/1024/1024/1024).toFixed(1)}G`
}

function buildDirPath(root, dir_id) {
  if (!root || !dir_id) return ''
  if (dir_id===1) return '/'
  const rootPath = (root.name==='/'||root.name==='')?'':`${root.name}/`
  if (root.id === dir_id) return rootPath
  for (const child of root.children) {
    const path = buildDirPath(child, dir_id)
    if (path) return `${rootPath}${path}`
  }
  return ''
}

export {
  fmtDate,
  timeToTs,
  fileMD5,
  saveFileAs,
  listToTree,
  calcFileSize,
  isFileExists,
  statFile,
  readFileByPath,
  readDirFiles,
  dirExists,
  makeDir,
  rmFile,
  rmDir,
  buildDirPath
}