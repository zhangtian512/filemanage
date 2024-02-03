import { errLog } from './log.js'
import { readConfigFile } from '../func/index.js'
var Minio = require('minio')
var defaultBucketName = 'fsd'

var config = {
  endPoint: 'localhost',
  // endPoint: '192.168.159.128',
  port: 9000,
  useSSL: false,
  accessKey: 'admin',
  secretKey: 'admin123'
}
var minioClient = null

function initMinio() {
  // if (process.env.NODE_ENV === 'production') {
    const setting = readConfigFile()
    if (setting && setting.oss) {
      config.accessKey = setting.oss.username
      config.secretKey = setting.oss.password
      config.endPoint = setting.oss.host
      config.port = setting.oss.port
    }
  // }
  
  minioClient = new Minio.Client(config)
  minioClient.bucketExists(defaultBucketName, function(err, exists) {
    if (err) {
      errLog(err.stack)
      return console.log('连接minio失败:',err)
    }
    console.log('连接minio成功')
    if (!exists) {
      minioClient.makeBucket(defaultBucketName, 'us-east-1', function(err) {
        if (err) {
          errLog(err.stack)
          return console.log('Error creating bucket.', err)
        }
        console.log('Bucket created successfully in "us-east-1".')
      })
    }
  })
}

function putObject(fileName, stream, size) {
  // console.log('putObject:',fileName,size)
  return new Promise(resolve => {
    minioClient.putObject(defaultBucketName, fileName, stream, size, function(err, objInfo) {
      if(err) {
        errLog(err.stack)
        console.log(err)
        resolve(err)
      } else resolve(null)
      // console.log('putObject complete:',fileName,size)
    })
  })
}

function fPutObject(file_path, file_size, fileName, type) {
  return new Promise((resolve,reject) => {
    var metaData = {
      'Content-Type': type,
      'size': file_size
    }
    minioClient.fPutObject(defaultBucketName, fileName, file_path, metaData, function(err, objInfo) {
      if (err) {
        errLog(err.stack)
        console.log("fPutObject Fail:", err)
        reject(err)
        return
      }
      console.log("fPutObject Success:", objInfo)
      resolve(objInfo)
    })
  })
}

function presignedPutObject(fileName) {
  return new Promise(resolve => {
    minioClient.presignedPutObject(defaultBucketName, fileName, 7*24*60*60, function(err, presignedUrl) {
      if (err) {
        errLog(err.stack)
        console.log(err)
        resolve(null)
        return
      }
      resolve(presignedUrl)
    })
  })
}

function composeObjects(chunkFileNames, destFileName, fileType, md5=null) {
  console.log('composeObjects:', chunkFileNames, destFileName, fileType)
  return new Promise((resolve,reject) => {
    const sourceList = chunkFileNames.map(name => {
      return new Minio.CopySourceOptions({
        Bucket: defaultBucketName,
        Object: name
      })
    })
    const destOption = new Minio.CopyDestinationOptions({
      Bucket: defaultBucketName,
      Object: destFileName,
      UserMetadata: {
        'Content-Type': fileType,
        'md5': md5
      }
    })
    minioClient.composeObject(destOption,sourceList).then((res) => {
      console.log("composeObject Success:", res)
      resolve(res)
    }).catch((err)=>{
      errLog(err.stack)
      console.log("composeObject Fail:", err)
      reject(err)
    })
  })
}

// 一次最多删除1000个obj
function removeObjects(objectNames) {
  console.log('removeObjects:', objectNames)
  return new Promise(resolve => {
    minioClient.removeObjects(defaultBucketName,objectNames,function(e) {
      if (e) {
        errLog(e.stack)
        console.log('Unable to remove Objects ',e)
        resolve(false)
      } else {
        console.log('Removed the objects successfully')
        resolve(true)
      }
    })
  })
}

function presignedGetObject(fileName, expire=1*24*60*60) {
  return new Promise(resolve => {
    minioClient.presignedGetObject(defaultBucketName, fileName, expire, function(err, presignedUrl) {
      if (err) {
        errLog(err.stack)
        console.log("presignedGetObject fail:", err)
        resolve(null)
      } else resolve(presignedUrl)
    })
  })
}

function getPartialObject(fileName, offset, length, callback) {
  // console.log('getPartialObject:',fileName, offset, length)
  return minioClient.getPartialObject(defaultBucketName, fileName, offset, length, callback)
}

function statObject(fileName) {
  return new Promise(resolve => {
    minioClient.statObject(defaultBucketName, fileName, (err,stat) => {
      if (err) {
        errLog(err.stack)
        console.error('statObject err:',err)
        resolve(null)
      } else {
        resolve(stat)
      }
    })
  })
}

function listObjects(prefix='', recursive=false, startAfter='') {
  console.log('listObjects:',prefix,recursive,startAfter)
  let data = []
  return new Promise(resolve => {
    var stream = minioClient.listObjectsV2(defaultBucketName, prefix, recursive, startAfter)
    stream.on('data', function(obj) {
      data.push(obj)
    })
    stream.on('end', function() {
      resolve(data)
    })
    stream.on('error', function(err) {
      errLog(err.stack)
      console.log('listObjects err:', err)
      errLog(err)
      resolve([])
    })
  })
}

function copyObject(srcFileName, dstFileName) {
  console.log('copyObject:',srcFileName, dstFileName)
  return new Promise((resolve,reject) => {
    var conds = new Minio.CopyConditions()
    minioClient.copyObject(defaultBucketName, dstFileName, `${defaultBucketName}/${srcFileName}`, conds, function(err, objInfo) {
      if (err) {
        errLog(err.stack)
        console.log("copyObject Fail:", err)
        reject(err)
        return
      }
      console.log("copyObject Success:", objInfo)
      resolve(objInfo)
    })
  })
}

export {
  initMinio,
  putObject,
  fPutObject,
  presignedPutObject,
  composeObjects,
  removeObjects,
  presignedGetObject,
  getPartialObject,
  statObject,
  listObjects,
  copyObject
}