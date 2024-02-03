<template>
  <Dialog
    v-if="show"
    :show="show"
    :title="'设置下载存储路径'"
    :width="600"
    :enableSave="enableSave"
    showDefaultFooterContent
    @close="close"
    @cancel="close"
    @confirm="confirm">
    <div style="padding: 10px 20px;">
      <div>
        <div style="display:flex;align-items:center;margin-bottom:5px;">
          <img :src="fileIcon(files.length>1?null:files[0].file_name)" style="width:40px;height:40px;margin-right:20px;" />
          <div style="width:500px">
            <div style="display:flex;font-size:16px;">
              <Tooltip :tips="files.map(file=>file.file_name)" style="width:100%">
                <span>{{ files.map(file=>file.file_name).join() }}</span>
              </Tooltip>
            </div>
            <div style="font-size:14px">{{ `总大小:${calcFileSize(totalFileSize)}` }}</div>
          </div>
        </div>
        <div style="display:flex;margin-bottom:5px;">
          <div style="font-size:14px;margin-right:15px;display:flex;align-items:center;">下载到</div>
          <div>
            <div style="display:flex;align-items:center;">
              <el-input v-model.trim="path" readonly size="small" style="width:350px;margin-right:5px;"></el-input>
              <div
                style="width:60px;height:30px;line-height:30px;border:1px solid #e6e6e6;cursor:pointer;font-size:14px;text-align:center;"
                @click="$refs.refUpload.click()">
                浏览
              </div>
              <input v-show="false" ref="refUpload" type="file" multiple @change="dirChange" webkitdirectory/>
            </div>
          </div>
        </div>
        <div style="margin-top:8px;font-size:14px" :style="{color:diskEnough?'':'red'}">
          {{ `${this.currDisk.toUpperCase()}盘剩余空间:${diskAvailableUsage}` }}
        </div>
        <div style="margin-top:8px;font-size:14px">
          <el-checkbox v-model="remeberDownloadDir">默认此路径为下载路径</el-checkbox>
        </div>
      </div>
    </div>
  </Dialog>
</template>
  
<script>
import { calcFileSize,isFileExists,readDirFiles } from '@/util/index.js'
import os from 'os'
import path from 'path'
import diskinfo from 'diskinfo'
import { chunkSize } from '@/config'
import { Task,DOWNLOAD_PATH } from '@/db/pg.js'

export default {
  name: '',
  components: {},
  props: {
    show:{type: Boolean,default:false},
    files:{type: Array,default:()=>{return []}}
  },
  data () {
    return {
      path: '',
      defaultDownloadCfg: null,
      diskInfo: {},
      remeberDownloadDir: false
    }
  },
  mounted () {},
  created () {
    this.readDefaultDownloadPath()
    this.getHDInfo()
  },
  watch: {},
  computed: {
    enableSave() {
      if (!this.diskEnough || !this.path || this.files.length===0) return false
      return true
    },
    currDisk() {
      // console.log(this.path.substring(0,2).toLowerCase())
      return this.path.substring(0,2).toLowerCase()
    },
    diskAvailableUsage() {
      var available = this.diskInfo[this.currDisk]?this.diskInfo[this.currDisk].available:null
      // console.log(available)
      return available===null?null:calcFileSize(available)
    },
    diskEnough() {
      if (this.diskAvailableUsage===null) return false
      const available = this.diskInfo[this.currDisk].available
      return this.totalFileSize<=available
    },
    totalFileSize() {
      let res = 0
      this.files.forEach(file=>{
        res += file.file_size
      })
      // console.log(res)
      return res
    }
  },
  methods: {
    calcFileSize,
    async readDefaultDownloadPath() {
      if (!localStorage.getItem('username')) return
      await DOWNLOAD_PATH.queryByUsername(localStorage.getItem('username')).then(res => {
        if (res.code !== 0) console.log(`读取默认下载路径失败:${res.msg}`)
        else {
          if (res.data && res.data[0]) this.defaultDownloadCfg = res.data[0]
          console.log('defaultDownloadCfg:', this.defaultDownloadCfg)
        }
      }).catch(err => {
        console.log(`读取默认下载路径失败:${err}`)
      })
      if (this.defaultDownloadCfg) this.path = this.defaultDownloadCfg.path_value
      else this.path = `${os.homedir()}\\Desktop`
    },
    saveDownloadDir() {
      if (!localStorage.getItem('username')) return
      let promise = null
      const data = {
        username: localStorage.getItem('username'),
        path_type: 'default',
        path_value: this.path
      }
      if (!this.defaultDownloadCfg) promise = DOWNLOAD_PATH.new(data)
      else promise = DOWNLOAD_PATH.update(data)
      promise.then(res => {
        if (res.code !== 0) this.$message.error(`保存默认下载路径失败:${res.msg}`)
      }).catch(err => {
        this.$message.error(`保存默认下载路径失败:${err}`)
      })
    },
    fileIcon (fileName) {
      let suffix = ''
      if (fileName) suffix = fileName.substring(fileName.lastIndexOf(".")+1,fileName.length)
      switch (suffix) {
        case 'docx':
        case 'doc':
          return require('@/assets/icons/icon-file-doc.svg')
        case 'xlsx':
        case 'xls':
          return require('@/assets/icons/icon-file-xls.svg')
        case 'pptx':
        case 'ppt':
          return require('@/assets/icons/icon-file-ppt.svg')
        case 'pdf':
          return require('@/assets/icons/icon-file-pdf.svg')
        case 'txt':
          return require('@/assets/icons/icon-file-txt.svg')
        case 'jpg':
        case 'jpeg':
        case 'bmp':
        case 'png':
        case 'svg':
        case 'gif':
          return require('@/assets/icons/icon-pic.svg')
        case 'mp4':
        case 'avi':
        case 'rmvb':
        case 'mov':
          return require('@/assets/icons/icon-video.svg')
        default:
          return require('@/assets/icons/icon-file-default.svg')
      }
    },
    getHDInfo() {
      let self = this
      diskinfo.getDrives((err, disks) => {
        //遍历所有磁盘信息
        for (const disk of disks) {
          // 盘符
          var mounted = disk.mounted.toLowerCase()
          this.$set(self.diskInfo, mounted, disk)
        }
      })
    },
    dirChange(evt) {
      this.path = evt.target.files[0].path
      this.$refs.refUpload.value = null
    },
    close() {
      this.path = ''
      this.$emit('update:show',false)
    },
    genNewFileName(dir, fileName, index=0) {
      let name = fileName
      const arr = fileName.split('.')
      const preffix = arr[0]
      const suffix = arr[1]
      if (index>0) name = `${preffix}(${index}).${suffix}`
      const fullPath = path.join(dir, name)
      if (isFileExists(fullPath)) {
        return this.genNewFileName(dir, fileName, index+1)
      }
      return name
    },
    checkDir() {
      return new Promise(async resolve => {
        let dupFileNames = []
        const dirFiles = await readDirFiles(this.path)
        console.log('readDirFiles:', dirFiles)
        this.files.forEach(item => {
          if (dirFiles.includes(item.file_name)) dupFileNames.push(item.file_name)
        })
        if (dupFileNames.length>0) resolve(`下载目录包含重名文件:${dupFileNames.join()}`)
        else resolve(null)
      })
    },
    checkTask(file) {
      return new Promise(async resolve => {
        const runningTask = this.$store.state.common.tasks.find(task => {
          if (task.task_type === 'download'
              && task.file_name === file.file_name
              && task.target_path === this.path
              && !['completed','error'].includes(task.status)) {
            return true
          }
          return false
        })
        console.log('@@@@@@@@@@@@@@@@@@@@@@@ runningTasks:', runningTask)
        if (runningTask) {
          this.$store.commit('common/updateTaskStatus', {task_id:runningTask.task_id,status:'init'})
          PubSub.publish('download', {id:runningTask.task_id,status:'init'})
          resolve(`文件[${file}]正在下载`)
        } else resolve(null)
      })
    },
    async confirm() {
      // 如果下载路径有重名文件，报错
      let err = await this.checkDir()
      if (err) return this.$message.error(err)
      for (const file of this.files) {
        // 如果下载任务有重名重路径文件，忽略当前任务，将队列任务激活
        err = await this.checkTask(file)
        if (err) {
          console.log(err)
          continue
        }
        const newTask = {
          task_id: `${new Date().getTime()}-${file.file_name}`,
          task_type: 'download',
          file_id: file.file_id,
          file_name: file.file_name,
          file_type: file.file_type,
          file_size: file.file_size,
          file_path: file.file_path,
          file_dir_id: file.file_dir_id,
          file_db_key: file.file_db_key,
          target_path: this.path,
          file_info: null,
          progress: 0,
          total_chunk_num: file.file_size>0?Math.ceil(file.file_size/chunkSize):0,
          finished_chunk_num: 0,
          canceler: null,
          status: 'init'
        }
        this.$store.commit('common/appendTasks', [newTask])
        Task.new(newTask)
        PubSub.publish('download', {id:newTask.task_id,status:'init'})
      }
      if (this.remeberDownloadDir) this.saveDownloadDir()
      this.close()
    }
  }
}
</script>
  
<style lang='scss' scoped>
</style>