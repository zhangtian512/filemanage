import { errLog } from '../db/log.js'
import { makeDir,readDirFiles } from '../util/index.js'
const { execFile } = require('child_process')
const path = require('path')

async function initDir() {
  const err = await makeDir('./data')
  if (err) console.log('初始化目录失败:', err)
}

function readConfigFile() {
  const fs = require('fs')
  if (!fs.existsSync('./static/config.json')) {
    console.log('配置文件config.json不存在')
    errLog('配置文件config.json不存在')
    return null
  }
  const jsonStr = fs.readFileSync('./static/config.json')
  if (!jsonStr) {
    console.log('配置文件config.json内容为空')
    errLog('配置文件config.json内容为空')
    return null
  }
  let res = null
  try {
    res = JSON.parse(jsonStr)
  } catch (err) {
    console.log('配置文件config.json内容非法')
    errLog('配置文件config.json内容非法')
  }
  // console.log('readConfigFile:', res)
  return res
}

async function readLatestMigrateFile() {
  const fs = require('fs')
  const files = await readDirFiles('./static/migrate/')
  const validFiles = files.filter(fileName => {
    return /^\d+\.\d+\.\d+\.sql$/.test(fileName)
  })
  console.log('migrate files:', validFiles)
  let maxNum = 0
  let latest = null
  validFiles.forEach(fileName => {
    const versions = fileName.split('.').slice(0,3)
    const num = Number(versions[0])*100 + Number(versions[1])*10 + Number(versions[2])
    if (maxNum < num) {
      maxNum = num
      latest = fileName
    }
  })
  if (!latest) return null
  console.log('migrate file:', latest)
  const sqlStr = fs.readFileSync(path.join('./static/migrate/', latest))
  // console.log(sqlStr.toString())
  return sqlStr.toString()
}

function writeConfigFile(setting) {
  const fs = require('fs')
  fs.writeFile('./static/config.json', JSON.stringify(setting, null, 2), {'flag': 'w'}, err=> {
    if (err) console.log('fs.writeFile err:', err)
  })
}

function playVideo(file_db_key) {
  const url = path.join('./data/', file_db_key)
  const env = {
    FFPROBE_PATH: path.join('./static/','ffprobe.exe'),
    FFMPEG_PATH: path.join('./static/','ffmpeg.exe')
  }
  console.log('playVideo:', url, env)
  execFile(
    './static/videoEditor.exe',
    ['play', 'local', url],
    { env: env},
    (error, stdout, stderr) => {
    if (error) return console.error(error)
    // 输出exe文件的标准输出
    console.log('stdout:', stdout)
    console.log('stderr:', stderr)
  })
}

function showPic(file_db_key) {
  const url = path.join('./data/', file_db_key)
  const env = {
    FFPROBE_PATH: path.join('./static/','ffprobe.exe'),
    FFMPEG_PATH: path.join('./static/','ffmpeg.exe')
  }
  console.log('showPic:', url, env)
  execFile(
    './static/videoEditor.exe',
    ['pic', 'local', url],
    { env: env},
    (error, stdout, stderr) => {
    if (error) return console.error(error)
    // 输出exe文件的标准输出
    console.log('stdout:', stdout)
    console.log('stderr:', stderr)
  })
}

function editVideo(file_db_key) {
  const url = path.join('./data/', file_db_key)
  const env = {
    FFPROBE_PATH: path.join('./static/','ffprobe.exe'),
    FFMPEG_PATH: path.join('./static/','ffmpeg.exe')
  }
  console.log('editVideo:', url, env)
  execFile(
    './static/videoEditor.exe',
    ['edit', 'local', url],
    { env: env},
    (error, stdout, stderr) => {
    if (error) return console.error(error)
      // 输出exe文件的标准输出
      console.log('stdout:', stdout)
      console.log('stderr:', stderr)
    }
  )
}

function playVideoOnline(url, video_type) {
  const env = {
    FFPROBE_PATH: path.join('./static/','ffprobe.exe'),
    FFMPEG_PATH: path.join('./static/','ffmpeg.exe')
  }
  console.log('playVideoOnline:', url, video_type, env)
  execFile(
    './static/videoEditor.exe',
    ['play', 'online', video_type, url],
    { env: env},
    (error, stdout, stderr) => {
    if (error) return console.error(error)
    // 输出exe文件的标准输出
    console.log('stdout:', stdout)
    console.log('stderr:', stderr)
  })
}

function showPicOnline(url, pic_type) {
  const env = {
    FFPROBE_PATH: path.join('./static/','ffprobe.exe'),
    FFMPEG_PATH: path.join('./static/','ffmpeg.exe')
  }
  console.log('showPic:', url, pic_type, env)
  execFile(
    './static/videoEditor.exe',
    ['pic', 'online', pic_type, url],
    { env: env},
    (error, stdout, stderr) => {
    if (error) return console.error(error)
    // 输出exe文件的标准输出
    console.log('stdout:', stdout)
    console.log('stderr:', stderr)
  })
}

function editVideoOnline(url, video_type) {
  const env = {
    FFPROBE_PATH: path.join('./static/','ffprobe.exe'),
    FFMPEG_PATH: path.join('./static/','ffmpeg.exe')
  }
  console.log('editVideo:', url, video_type, env)
  execFile(
    './static/videoEditor.exe',
    ['edit', 'online', video_type, url],
    { env: env},
    (error, stdout, stderr) => {
    if (error) return console.error(error)
      // 输出exe文件的标准输出
      console.log('stdout:', stdout)
      console.log('stderr:', stderr)
    }
  )
}

export {
  initDir,
  readConfigFile,
  writeConfigFile,
  playVideo,
  showPic,
  editVideo,
  playVideoOnline,
  showPicOnline,
  editVideoOnline,
  readLatestMigrateFile
}