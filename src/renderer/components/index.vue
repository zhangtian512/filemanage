<template>
  <div class="home-wrapper">
    <div style="height:66px;display:flex;align-items:center;flex-shrink:0;flex-grow:0;padding:0px 16px;
        background:linear-gradient(rgb(5,96,177), rgb(6,86,171));color:#fff;border-bottom:4px solid #003d80;">
      <div class="logo"></div>
      <div style="font-size:22px;font-weight:700;margin-right:auto">文件管理系统</div>
      <div style="font-size:22px;font-weight:700;margin-right:auto"></div>
      <div class="icon-avatar"></div>
      <div style="font-size:22px;font-weight:700;margin-right:20px">{{ username }}</div>
      <div class="icon-minimize" @click="minimize" style="margin-right:14px;"></div>
      <!-- <div class="icon-maximize" @click="maximize"></div> -->
      <div class="icon-close" @click="close"></div>
    </div>
    <div style="flex:1;display:flex;flex-direction:column;background-color:#e2eaf5;-webkit-app-region:no-drag;">
      <div style="flex-shrink:0;flex-grow:0;width:100%;height:90px;display:flex;align-items:center;box-sizing:border-box;padding:0px 24px;margin-bottom:10px;">
        <div class="nav-btn" :class="this.$route.name==='filelist'?'nav-btn-active':''" @click="changeTab('filelist')">
          <div class="icon-doc"></div>
          <div class="nav-btn-text">文件管理</div>
        </div>
        <div class="nav-btn" :class="this.$route.name==='transfer'?'nav-btn-active':''" @click="changeTab('transfer')" style="position:relative">
          <div v-if="currTransferNum>0" class="transfer-num">{{ currTransferNum }}</div>
          <div v-loading="transferLoading" class="icon-transfer"></div>
          <div class="nav-btn-text">传输任务</div>
        </div>
        <div class="nav-btn" :class="this.$route.name==='syssetting'?'nav-btn-active':''" @click="changeTab('syssetting')">
          <div class="icon-system-setting"></div>
          <div class="nav-btn-text">系统设置</div>
        </div>
      </div>
      <div style="flex:1">
        <router-view />
      </div>
    </div>
  </div>
</template>
  
<script>
import axios from 'axios'
import { remote } from 'electron'
import { Task,File } from '@/db/pg.js'
import { fileMD5,rmDir,fmtDate,readDirFiles,isFileExists,statFile } from '@/util/index.js'
import { chunkSize } from '@/config'
import { findFileInPgByKey } from '@/func/file.js'
import { uploadFile,clearUploadTaskChunk,downloadFile,clearDownloadTaskChunk } from '@/func/file_online.js'
import { statObject } from '@/db/minio.js'
import { PubSub } from '@/func/pubsub.js'
import path from 'path'

export default {
  name: '',
  components: {},
  props: {},
  data () {
    return {
      transferLoading: false
    }
  },
  async mounted () {},
  created () {
    // this.$store.commit('common/clearTasks')
    this.resizeWindow()
    this.initTasks()
    // 注册全局事件监听
    PubSub.subscribe('upload', (msg, data) => {
      console.log('收到上传任务更新通知',msg, data, ' 正在进行任务数量:', this.uploadingTaskCount)
      if (msg === 'upload' && this.uploadingTaskCount < 3) this.handleUploadTasks(data.id, data.status)
    })
    PubSub.subscribe('download', (msg, data) => {
      console.log('收到下载任务更新通知',msg, data, ' 正在进行任务数量:', this.downloadingTaskCount)
      if (msg === 'download' && this.downloadingTaskCount < 3) this.handleDownloadTasks(data.id, data.status)
    })
  },
  watch: {},
  computed: {
    username() {
      return localStorage.getItem('username')
    },
    currTransferNum() {
      return this.$store.state.common.tasks.filter(task => {
        return ['init','md5','pause','readyupload','readydownload','uploading','downloading','composing'].includes(task.status)
      }).length
    },
    uploadingTaskCount() {
      return this.$store.state.common.tasks.filter(task => {
        return task.task_type === 'upload' && ['md5','readyupload','uploading','composing'].includes(task.status)
      }).length
    },
    downloadingTaskCount() {
      return this.$store.state.common.tasks.filter(task => {
        return task.task_type === 'download' && ['uploading'].includes(task.status)
      }).length
    }
  },
  methods: {
    resizeWindow() {
      const win = remote.getCurrentWindow()
      win.setResizable(true)
      this.maximize()
      // win.setSize(1600,900)
      // win.setMinimumSize(1350,700)
      // win.center()
    },
    // 从数据库读取所有任务记录
    initTasks() {
      console.log('初始化数据库中的task')
      this.transferLoading = true
      let tasks = []
      Task.getAll().then(async res => {
        if (res.code !== 0) this.$message.error(`获取任务数据失败:${res.msg}`)
        else {
          for (const task of res.data) {
            task.file_size = Number(task.file_size)
            if (task.task_type === 'upload') {
              if (['init','md5','pause','readyupload','uploading','downloading','composing'].includes(task.status)) {
                task.status = 'pause'
              }
            }
            if (task.task_type === 'download') {
              if (['init','pause','downloading','composing'].includes(task.status)) {
                task.status = 'pause'
              }
            }
            tasks.push(task)
          }
        }
      }).finally(() => {
        this.$store.commit('common/setTasks', tasks)
        this.transferLoading = false
      })
    },
    // 有上传任务完成时，需要找出一条新的待上传任务触发上传过程
    triggerNewUploadTask() {
      this.$store.state.common.tasks.forEach(task => {
        if (task.status === 'init') {
          PubSub.publish('upload', {id:task.task_id,status:'init'})
          return
        }
      })
    },
    async handleUploadTasks(task_id, status) {
      const task = this.$store.state.common.tasks.find(item => {return item.task_type === 'upload' && item.task_id === task_id})
      if (task) {
        switch (status) {
          case 'init':
            this.$store.commit('common/updateTaskStatus', {task_id:task.task_id,status:'md5'})

            // 判断文件是否丢失
            if (!isFileExists(task.file_path)) {
              this.$store.commit('common/updateTaskStatus', {task_id:task.task_id,status:'pause',err_msg:`本地文件路径不存在或非法:${task.file_path}`})
              PubSub.publish('upload', {id:task.task_id,status:'error',err:`本地文件路径不存在或非法:${task.file_path}`})
              return
            }
            const file_info = statFile(task.file_path)
            console.log('file_info:', file_info)
            const fileSize = file_info.size

            // 最大上传25G文件
            if (fileSize>25*1024*1024*1024) {
              const msg = `文件大小超过25G:${(fileSize/1024/1024/1024).toFixed(2)}G`
              this.$message.error(msg)
              this.$store.commit('common/updateTaskStatus', {task_id:task.task_id,status:'error',err_msg:msg})
              PubSub.publish('upload', {id:task.task_id,status:'error',err:msg})
              return
            }
            
            // 计算md5
            const {md5, err} = await fileMD5(task.file_path)
            if (err) {
              this.$store.commit('common/updateTaskStatus', {task_id:task.task_id,status:'pause',err_msg:err.toString()})
              PubSub.publish('upload', {id:task.task_id,status:'error',err:err.toString()})
              return
            }
            if (!md5) {
              this.$store.commit('common/updateTaskStatus', {task_id:task.task_id,status:'pause',err_msg:'计算文件md5失败'})
              PubSub.publish('upload', {id:task.task_id,status:'error',err:'计算文件md5失败'})
              return
            }
            // 如果队列中有相同md5的文件正在上传直接报错
            const sameMd5Task = this.$store.state.common.tasks.find(item => {
              return item.task_type==='upload'&&item.file_id===md5&&['init','pause','uploading','composing','cancel'].includes(item.status)
            })
            if (sameMd5Task) {
              this.$store.commit('common/updateTaskStatus', {task_id:task.task_id,status:'pause',err_msg:`与其他正在进行任务的文件md5重复:${sameMd5Task.file_name}`})
              PubSub.publish('upload', {id:task.task_id,status:'error',err:`与其他正在进行任务的文件md5重复:${sameMd5Task.file_name}`})
              return
            }

            // 如果文件名字没换，内容改变导致md5变了，需要重新计算file_id、file_size和total_chunk_num
            // 同时需要移除minio中的chunk垃圾
            if (task.file_id && md5 !== task.file_id) {
              console.log('========= 文件的md5改变 =========')
              const total_chunk_num = fileSize>0?Math.ceil(fileSize/chunkSize):0
              this.$store.commit('common/updateTaskFileSizeAndTotalChunkNum', {task_id:task.task_id,file_size:fileSize,total_chunk_num:total_chunk_num})
              await clearUploadTaskChunk(task)
            }

            // 从数据库中加载的task没有total_chunk_num，如果客户端重启，则需要重新计算total_chunk_num
            if (!task.total_chunk_num) {
              const total_chunk_num = fileSize>0?Math.ceil(fileSize/chunkSize):0
              this.$store.commit('common/updateTaskTotalChunkNum', {task_id:task.task_id,total_chunk_num:total_chunk_num})
            }

            this.$store.commit('common/updateUploadTaskFileId', {task_id:task.task_id,file_id:md5})
            if (!task.file_db_key) {
              let suffix = ''
              const index = task.file_name.lastIndexOf('.')
              if (index !== -1) suffix = task.file_name.substring(index,task.file_name.length)
              // const file_db_key = `${task.file_id}-${fmtDate(new Date(),'YYYYmmddHHMMSS')}${Math.floor(Math.random()*999)}${suffix}`
              const file_db_key = `${task.file_id}${suffix}`
              this.$store.commit('common/updateUploadTaskFileDbKey', {task_id:task.task_id,file_db_key:file_db_key})
            }
            this.$store.commit('common/setCanceler', {task_id:task.task_id,canceler:axios.CancelToken.source()})
            // uploadFileLocal(task)
            uploadFile(task)
            return
          case 'pause':
            this.$store.commit('common/updateTaskStatus', {task_id:task.task_id,status:'pause'})
            if (task.canceler) task.canceler.cancel('canceled by user')
            return
          case 'cancel':
            if (task.canceler) task.canceler.cancel('canceled by user')
            this.$store.commit('common/removeTask', [task])
            clearUploadTaskChunk(task)
            return
          case 'completed':
            await File.save({
              file_id: task.file_id,
              task_id: task.task_id,
              file_name: task.file_name,
              file_type: task.file_type,
              file_size: task.file_size,
              file_path: task.file_path,
              file_dir_id: task.file_dir_id,
              file_db_key: task.file_db_key,
              file_info: task.file_info
            })
            PubSub.publish('refresh','completed')
            this.triggerNewUploadTask()
            return
          case 'error':
            this.triggerNewUploadTask()
            return
          default:
            return
        }
      }
    },
    // 有下载任务完成时，需要找出一条新的待上传任务触发上传过程
    triggerNewDownloadTask() {
      this.$store.state.common.tasks.forEach(task => {
        if (task.status === 'init') {
          PubSub.publish('download', {id:task.task_id,status:'init'})
          return
        }
      })
    },
    async handleDownloadTasks(task_id, status) {
      const task = this.$store.state.common.tasks.find(item => {return item.task_type === 'download' && item.task_id === task_id})
      if (task) {
        switch (status) {
          case 'init':
            // 目标文件夹包含同名文件 报错中止任务
            let err = await this.checkDownloadDir(task.target_path, task.file_name)
            if (err) {
              this.$store.commit('common/updateTaskStatus', {task_id:task.task_id,status:'error',err_msg:err})
              clearDownloadTaskChunk(task)
              return
            }
            // 下载的文件从pg中删除了 报错并删除本地文件夹
            const dbFile = await findFileInPgByKey(task.file_db_key)
            if (!dbFile) {
              err = `数据库中不存在该文件 file_name:${task.file_name} file_db_key:${task.file_db_key}`
              this.$store.commit('common/updateTaskStatus', {task_id:task.task_id,status:'error',err_msg:err})
              this.$message.error(`数据库文件丢失:${task.file_db_key}`)
              clearDownloadTaskChunk(task)
              return
            }
            // 下载的文件从minio删除了 - 报错并删除本地文件夹
            const fileStat = await statObject(task.file_db_key)
            console.log('fileStat',fileStat)
            if (!fileStat) {
              err = `对象存储中不存在该文件file_db_key:${task.file_db_key}`
              this.$store.commit('common/updateTaskStatus', {task_id:task.task_id,status:'error',err_msg:err})
              this.$message.error(`对象存储文件丢失:${task.file_db_key}`)
              clearDownloadTaskChunk(task)
              return
            }
            
            // 下载的文件size和task里的不一致 - 报错并删除文件夹
            if (task.file_size !== fileStat.size) {
              err = `对象存储中该文件大小发生变化 origin:${task.file_size} current:${fileStat.size}`
              this.$store.commit('common/updateTaskStatus', {task_id:task.task_id,status:'error',err_msg:err})
              clearDownloadTaskChunk(task)
              return
            }
            // 从数据库中加载的task没有total_chunk_num，如果客户端重启，则需要重新计算total_chunk_num
            if (!task.total_chunk_num) {
              const total_chunk_num = task.file_size>0?Math.ceil(task.file_size/chunkSize):0
              this.$store.commit('common/updateTaskTotalChunkNum', {task_id:task.task_id,total_chunk_num:total_chunk_num})
            }
            downloadFile(task)
            // downloadFileLocal(task, chunkSize)
            break
          case 'pause':
            this.$store.commit('common/updateTaskStatus', {task_id:task.task_id,status:'pause'})
            this.$store.commit('common/setCanceler', {task_id:task.task_id,canceler:'paused by user'})
            return
          case 'cancel':
            this.$store.commit('common/setCanceler', {task_id:task.task_id,canceler:'canceled by user'})
            this.$store.commit('common/removeTask', [task])
            setTimeout(()=>{clearDownloadTaskChunk(task)},1000)
            return
          case 'error':
            this.triggerNewDownloadTask()
          default:
            return
        }
      }
    },
    checkDownloadDir(path, file_name) {
      return new Promise(async resolve => {
        const dirFiles = await readDirFiles(path)
        console.log('readDirFiles:', dirFiles)
        if (dirFiles.includes(file_name)) resolve(`下载目录包含重名文件:${file_name}`)
        else resolve(null)
      })
    },
    changeTab(tabName) {
      if (this.$route.name !== tabName) this.$router.push({name:tabName})
    },
    minimize() {
      remote.getCurrentWindow().minimize()
    },
    maximize() {
      const win=remote.getCurrentWindow()
      if( win.isMaximized() ) win.restore()
      else win.maximize()
    },
    close() {
      remote.getCurrentWindow().destroy()
    },
    initWebSocket() {
      const ws = require('nodejs-websocket');
      const server = ws.createServer(connect => {
        connect.on("text", data => {
          console.log("received: "+data)
          connect.sendText(data);
        })
        connect.on("close", (code, reason) => {
          console.log("connection closed:", code, reason)
        })
        connect.on('error', err=>{
          console.log("connection error:", err)
        })
      })
      server.listen(8001, ()=>{
        console.log("websocket server start success!")
      })
    }
  }
}
</script>
  
<style lang='scss' scoped>
.home-wrapper {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;

  .nav-btn {
    height: 66px;
    display: flex;
    align-items: center;
    box-sizing: border-box;
    padding:0px 18px;
    border-radius: 10px;
    background: linear-gradient(rgb(243,247,250), rgb(255,255,255));
    box-shadow: 1px 3px 2px 1px #99b1cd;
    margin-right: 24px;
    cursor: pointer;
    .nav-btn-text {
      font-size: 22px;
      font-weight: 700;
      margin-left: 10px;
    }
  }
  .nav-btn-active {
    background: linear-gradient(rgb(36,113,195), rgb(18,95,177));
    .nav-btn-text {
      color: #ffffff;
    }
  }
  .logo {
    // width: 28px;
    height: 32px;
    margin-right: 10px;
    content: url('../assets/logo.svg');
  }
  .icon-avatar {
    width: 36px;
    height: 36px;
    margin-right: 5px;
    content: url('../assets/icons/avatar.svg');
  }
  .icon-minimize {
    width: 32px;
    height: 36px;
    cursor: pointer;
    -webkit-app-region: no-drag;
    content: url('../assets/icons/minimize.svg');
  }
  .icon-minimize:hover {
    content: url('../assets/icons/minimize-hover.svg');
  }
  .icon-minimize:active {
    content: url('../assets/icons/minimize-hover.svg');
  }
  .icon-maximize {
    width: 36px;
    height: 36px;
    cursor: pointer;
    margin-right: 5px;
    -webkit-app-region: no-drag;
    content: url('../assets/icons/maximize.svg');
  }
  .icon-maximize:hover {
    content: url('../assets/icons/maximize-hover.svg');
  }
  .icon-maximize:active {
    content: url('../assets/icons/maximize-hover.svg');
  }
  .icon-close {
    width: 32px;
    height: 32px;
    cursor: pointer;
    -webkit-app-region: no-drag;
    content: url('../assets/icons/close.svg');
  }
  .icon-close:hover {
    content: url('../assets/icons/close-hover.svg');
  }
  .icon-close:active {
    content: url('../assets/icons/close-hover.svg');
  }
  .icon-doc {
    width: 40px;
    height: 40px;
    // cursor: pointer;
    -webkit-app-region: no-drag;
    // content: url('../assets/icons/doc.svg');
    content: url('../assets/icons/doc-fill.svg');
  }
  // .icon-doc:hover {
  //   content: url('../assets/icons/doc-hover.svg');
  // }
  // .icon-doc:active {
  //   content: url('../assets/icons/doc-hover.svg');
  // }
  // .doc-active {
  //   width: 40px;
  //   height: 40px;
  //   cursor: pointer;
  //   -webkit-app-region: no-drag;
  //   content: url('../assets/icons/doc-hover.svg');
  // }
  .icon-transfer {
    width: 40px;
    height: 40px;
    // cursor: pointer;
    -webkit-app-region: no-drag;
    // content: url('../assets/icons/transfer.svg');
    content: url('../assets/icons/transffer-fill.svg');
  }
  // .icon-transfer:hover {
  //   content: url('../assets/icons/transfer-hover.svg');
  // }
  // .icon-transfer:active {
  //   content: url('../assets/icons/transfer-hover.svg');
  // }
  // .transfer-active {
  //   width: 40px;
  //   height: 40px;
  //   cursor: pointer;
  //   -webkit-app-region: no-drag;
  //   content: url('../assets/icons/transfer-hover.svg');
  // }

  .icon-system-setting {
    width: 40px;
    height: 40px;
    -webkit-app-region: no-drag;
    content: url('../assets/icons/icon-system-setting.svg');
  }
  .transfer-num {
    z-index: 2;
    position: absolute;
    top: 0px;
    right: 0px;
    background-color: red;
    color: #fff;
    border-radius: 40%;
    min-width: 18px;
    height: 18px;
    line-height: 18px;
    text-align: center;
    font-size: 10px;
  }
}
</style>