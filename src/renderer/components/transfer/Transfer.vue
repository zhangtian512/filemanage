<template>
  <div class="transfer-wrapper" v-loading="loading">
    <!-- <div style="width:320px;height:100%;background-color: #fff;">
      <div class="btn" :class="activePage==='upload'?'btn-active':''" @click="activePage='upload'">正在上传</div>
      <div class="btn" :class="activePage==='download'?'btn-active':''" @click="activePage='download'">正在下载</div>
      <div class="btn" :class="activePage==='completed'?'btn-active':''" @click="activePage='completed'">传输完成</div>
    </div> -->
    <div style="width:320px;display:flex;flex-direction:column;align-items:center;">
      <div
        class="btn"
        :class="activePage==='upload'?'btn-active':''"
        :style="{borderRadius:'16px 46px 0px 0px',boxShadow:'2px -2px 10px 1px rgb(153, 177, 205)',zIndex:1}"
        @click="activePage='upload'">
        正在上传
      </div>
      <div
        class="btn"
        :class="activePage==='download'?'btn-active':''"
        :style="{borderTop:'1px solid rgb(212,222,231)',borderBottom:'1px solid rgb(212,222,231)',boxShadow:'2px 0px 10px 0px rgb(153, 177, 205)'}"
        @click="activePage='download'">
        正在下载
      </div>
      <div
        class="btn"
        :class="activePage==='completed'?'btn-active':''"
        :style="{borderRadius:'0px 0px 46px 16px',boxShadow:'2px 2px 10px 1px rgb(153, 177, 205)',zIndex:1}"
        @click="activePage='completed'">
        传输完成
      </div>
    </div>
    <div class="right">
      <!-- 上传任务  -->
      <TableCard v-if="activePage==='upload'" :showFooter="false" style="border-radius:12px;padding:0px;box-shadow:0 0 10px 5px rgba(204, 216, 228, 1);">
        <template slot="title">
          <div style="margin-left:20px">{{ `共${uploads.length}个上传任务` }}</div>
        </template>
        <template slot="titleRight">
          <div style="display:flex;align-items:center;margin-right:20px">
            <Button @click="startAll" type="info" :disable="isUploadStartAllDisable" plain size="mini" style="margin-right:10px;font-size:14px;font-weight:700;">全部开始</Button>
            <Button @click="pauseAll" type="info" :disable="isUploadPauseAllDisable" plain size="mini" style="margin-right:10px;font-size:14px;font-weight:700;">全部暂停</Button>
            <Button @click="cancelAll" type="info" :disable="this.uploads.length===0" plain size="mini" style="font-size:14px;font-weight:700;">全部取消</Button>
          </div>
        </template>
        <div style="width:100%;height:1px;background-color:#d6dde7;"></div>
        <div v-for="item,index in uploads" :key="index">
          <div class="list-item">
            <img :src="fileIcon(item.file_name)" style="width:40px;height:40px;">
            <div style="margin-left:20px;font-size:16px;;margin-right:10px">
              <div style="display:flex;">
                <Tooltip :tips="item.file_name" style="width:350px">
                  <span>{{ item.file_name }}</span>
                </Tooltip>
              </div>
              <div style="font-size:14px;color:#a6a6a6;margin-top:5px;">{{ calcFileSize(item.file_size) }}</div>
            </div>
            <div style="width:260px;margin-right:10px;font-size:14px;">
              <div>文件位置</div>
              <div style="display:flex;margin-top:5px;">
                <Tooltip :tips="item.file_path" style="width:260px">
                  <span>{{ item.file_path }}</span>
                </Tooltip>
              </div>
            </div>
            <div style="width:260px;margin-right:10px;font-size:14px;">
              <div>所在服务器目录</div>
              <div style="display:flex;margin-top:5px;">
                <Tooltip :tips="buildPath(item.file_dir_id)" style="width:260px">
                  <span style="font-size:14px;">{{ buildPath(item.file_dir_id) }}</span>
                </Tooltip>
              </div>
            </div>
            <div style="width:260px;margin-right:10px">
              <el-progress text-inside :stroke-width="18" :percentage="item.progress" />
              <div style="margin-top:5px;font-size:14px;color:#a6a6a6">
                <Tooltip :tips="statusText(item)" style="width:260px">
                  <span>{{ statusText(item) }}</span>
                </Tooltip>
              </div>
            </div>
            <div style="display:flex;align-items:center;">
              <Tooltip keep tips="开始">
                <div v-if="item.status==='pause'" class="icon-start-task" @click="start(item)"></div>
              </Tooltip>
              <Tooltip keep tips="暂停">
                <div v-if="item.status==='uploading'" class="icon-pause-task" @click="pause(item)"></div>
              </Tooltip>
              <Tooltip keep tips="取消">
                <div v-if="item.status==='uploading'||item.status==='pause'" class="icon-close" @click="cancel(item)"></div>
              </Tooltip>
              <Tooltip keep tips="打开所在服务器目录">
                <div class="icon-doc" @click="openLocalFolder(`${item.file_path}`)"></div>
              </Tooltip>
            </div>
          </div>
        </div>
      </TableCard>
      <!-- 下载任务  -->
      <TableCard v-if="activePage==='download'" :showFooter="false" style="border-radius:12px;padding:0px;box-shadow:0 0 10px 5px rgba(204, 216, 228, 1);">
        <template slot="title">
          <div style="margin-left:20px">{{ `共${downloads.length}个下载任务` }}</div>
        </template>
        <template slot="titleRight">
          <div style="display:flex;align-items:center;margin-right:20px">
            <Button @click="startAll('download')" type="info" :disable="isDownloadStartAllDisable" plain size="mini" style="margin-right:10px;font-size:14px;font-weight:700;">全部开始</Button>
            <Button @click="pauseAll('download')" type="info" :disable="isDownloadPauseAllDisable" plain size="mini" style="margin-right:10px;font-size:14px;font-weight:700;">全部暂停</Button>
            <Button @click="cancelAll('download')" type="info" :disable="this.downloads.length===0" plain size="mini" style="font-size:14px;font-weight:700;">全部取消</Button>
          </div>
        </template>
        <div style="width:100%;height:1px;background-color:#d6dde7;"></div>
        <div v-for="item,index in downloads" :key="index">
          <div class="list-item">
            <img :src="fileIcon(item.file_name)" style="width:40px;height:40px;">
            <div style="margin-left:20px;font-size:16px;;margin-right:10px">
              <div style="display:flex;">
                <Tooltip :tips="item.file_name" style="width:350px">
                  <span>{{ item.file_name }}</span>
                </Tooltip>
              </div>
              <div style="font-size:14px;color:#a6a6a6;margin-top:5px;">{{ calcFileSize(item.file_size) }}</div>
            </div>
            <div style="width:220px;margin-right:10px">
              <el-progress text-inside :stroke-width="18" :percentage="item.progress"></el-progress>
              <div style="margin-top:5px;font-size:14px;color:#a6a6a6">
                <Tooltip :tips="statusText(item)" style="width:220px">
                  <span>{{ statusText(item) }}</span>
                </Tooltip>
              </div>
            </div>
            <div style="width:260px;margin-right:10px;font-size:14px;">
              <div>本地位置</div>
              <div style="display:flex;margin-top:5px;">
                <Tooltip :tips="item.target_path" style="width:260px">
                  <span>{{ item.target_path }}</span>
                </Tooltip>
              </div>
            </div>
            <div style="width:260px;margin-right:10px;font-size:14px;">
              <div>所在服务器目录</div>
              <div style="display:flex;margin-top:5px;">
                <Tooltip :tips="buildPath(item.file_dir_id)" style="width:260px">
                  <span style="font-size:14px;">{{ buildPath(item.file_dir_id) }}</span>
                </Tooltip>
              </div>
            </div>
            <div style="display:flex;align-items:center;">
              <Tooltip keep tips="开始">
                <div v-if="item.status==='pause'" class="icon-start-task" @click="start(item, 'download')"></div>
              </Tooltip>
              <Tooltip keep tips="暂停">
                <div v-if="item.status==='downloading'" class="icon-pause-task" @click="pause(item, 'download')"></div>
              </Tooltip>
              <Tooltip keep tips="取消">
                <div v-if="item.status==='downloading'||item.status==='pause'" class="icon-close" @click="cancel(item, 'download')"></div>
              </Tooltip>
              <Tooltip keep tips="打开所在服务器目录">
                <div class="icon-doc" @click="openFolder(item.file_dir_id)"></div>
              </Tooltip>
            </div>
          </div>
        </div>
      </TableCard>
      <!-- 已完成任务  -->
      <TableCard v-if="activePage==='completed'" :showFooter="false" style="border-radius:12px;padding:0px;box-shadow:0 0 10px 5px rgba(204, 216, 228, 1);">
        <template slot="title">
          <div style="margin-left:20px">{{ `共传输完成${completes.length}个文件` }}</div>
        </template>
        <template slot="titleRight">
          <div style="display:flex;align-items:center;margin-right:20px">
            <div v-if="completes.length>0" style="margin-left:auto">
            <!-- <Button @click="delRecordsShow=true" type="info" plain size="mini">清除全部记录</Button> -->
            <Button @click="delRecordsShow=true" type="info" style="font-size:14px;font-weight:700;" plain size="mini">清除全部记录</Button>
            <Dialog
              v-if="delRecordsShow"
              :show="delRecordsShow"
              :title="'系统提示'"
              :width="400"
              :loading="loading"
              showDefaultFooterContent
              @close="delRecordsShow=false"
              @cancel="delRecordsShow=false"
              @confirm="delRecordsShow=false;removeRecords()">
              <div style="padding: 22px 20px;">
                <div style="font-size:18px">确定要清空全部上传和下载记录吗?</div>
              </div>
            </Dialog>
          </div>
          </div>
        </template>
        <div style="width:100%;height:1px;background-color:#d6dde7;"></div>
        <div class="list-area">
          <div v-for="item,index in completes" :key="index">
            <div class="list-item">
              <img :src="fileIcon(item.file_name)" style="width:40px;height:40px;">
              <div style="margin-left:20px;font-size:16px;;margin-right:10px">
                <div style="display:flex;">
                  <Tooltip :tips="item.file_name" style="width:350px">
                    <span>{{ item.file_name }}</span>
                  </Tooltip>
                </div>
                <div style="font-size:14px;color:#a6a6a6;margin-top:5px;">{{ calcFileSize(item.file_size) }}</div>
              </div>
              <div v-if="item.task_type==='upload'" style="width:260px;margin-right:10px;font-size:14px;">
                <div>源文件位置</div>
                <div style="display:flex;margin-top:5px;">
                  <Tooltip :tips="item.file_path" style="width:260px">
                    <span>{{ item.file_path }}</span>
                  </Tooltip>
                </div>
              </div>
              <div v-if="item.task_type==='download'" style="width:260px;margin-right:10px;font-size:14px;">
                <div>本地位置</div>
                <div style="display:flex;margin-top:5px;">
                  <Tooltip :tips="item.target_path" style="width:260px">
                    <span>{{ item.target_path }}</span>
                  </Tooltip>
                </div>
              </div>
              <div style="width:260px;margin-right:10px;font-size:14px;">
                <div>所在服务器目录</div>
                <div style="display:flex;margin-top:5px;">
                  <Tooltip :tips="buildPath(item.file_dir_id)" style="width:260px">
                    <span style="font-size:14px;">{{ buildPath(item.file_dir_id) }}</span>
                  </Tooltip>
                </div>
              </div>
              <div style="width:210px;margin-right:10px">
                <div>{{ fmtDate(item.update_time) }}</div>
              </div>
              <div style="width:100px;margin-right:10px">
                <div>
                  <div v-if="item.task_type==='upload'&&item.status==='completed'" style="color:green">上传完成</div>
                  <div v-if="item.task_type==='download'&&item.status==='completed'" style="color:#1296DB">下载完成</div>
                  <div v-if="item.err_msg" style="margin-top:5px;font-size:14px;color:#a6a6a6">
                    <Tooltip :tips="item.err_msg.toString()" style="width:100px">
                      <span>{{ item.err_msg }}</span>
                    </Tooltip>
                  </div>
                </div>
              </div>
              <div style="display:flex;align-items:center;">
                <Tooltip v-if="item.task_type==='upload'" keep tips="所在服务器目录">
                  <div  class="icon-doc" @click="openFolder(item.file_dir_id)"></div>
                </Tooltip>
                <Tooltip keep :tips="`打开本地位置`">
                  <div v-if="item.task_type==='download'" class="icon-doc" @click="openLocalFolder(`${item.target_path}\\${item.file_name}`)"></div>
                </Tooltip>
                <Tooltip keep tips="清除记录">
                  <div class="icon-close" @click="removeRecord(item)"></div>
                </Tooltip>
              </div>
            </div>
          </div>
        </div>
      </TableCard>
    </div>
  </div>
</template>

<script>
import { calcFileSize,fmtDate,buildDirPath } from '@/util/index.js'

export default {
  name: '',
  components: {},
  data() {
    return {
      loading: false,
      activePage: 'upload',
      delRecordsShow: false,
      dirTree: null
    }
  },
  created() {},
  mounted() {
    if (this.uploads.length > 0) {
      this.activePage = 'upload'
      return
    }
    if (this.downloads.length > 0) {
      this.activePage = 'download'
      return
    }
  },
  computed: {
    uploads() {
      return this.$store.state.common.tasks.filter(task => {
        return task.task_type==='upload' && task.status!=='completed' && task.status!=='error'
      })
    },
    downloads() {
      return this.$store.state.common.tasks.filter(task => {
        return task.task_type==='download' && task.status!=='completed' && task.status!=='error'
      })
    },
    completes() {
      return this.$store.state.common.tasks.filter(task => {
        return task.status==='completed' || task.status==='error'
      })
    },
    isUploadStartAllDisable() {
      if (!this.uploads.find(task => {return task.status==='pause'})) return true
      return false
    },
    isUploadPauseAllDisable() {
      if (!this.uploads.find(task => {return task.status==='uploading'})) return true
      return false
    },
    isDownloadStartAllDisable() {
      if (!this.downloads.find(task => {return task.status==='pause'})) return true
      return false
    },
    isDownloadPauseAllDisable() {
      if (!this.downloads.find(task => {return task.status==='downloading'})) return true
      return false
    }
  },
  methods: {
    fmtDate,
    calcFileSize,
    buildPath(dir_id) {
      return buildDirPath(this.$store.state.common.dirTreeData[0], dir_id)
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
    statusText(task) {
      switch(task.status) {
        case 'init':
          return '初始化...'
        case 'md5':
          return '计算文件md5...'
        case 'pause':
          return `暂停${task.err_msg?':'+task.err_msg:''}`
        case 'readydownload':
          return '开始下载'
        case 'uploading':
          return '上传中...'
        case 'downloading':
          return '下载中...'
        case 'composing':
          return '合并中...'
        case 'completed':
          return '上传完成'
        case 'error':
          return `${task.err_msg?task.err_msg:''}`
        default:
          return task.status
      }
    },
    removeRecord(task) {
      this.$store.commit('common/removeTask', [task])
    },
    removeRecords() {
      this.$store.commit('common/removeTask', this.completes)
    },
    openFolder(path) {
      this.$router.push({
        name: 'filelist',
        query: {
          dir: path
        }
      })
    },
    openLocalFolder(path) {
      console.log(path)
      var exec = require('child_process').exec
      exec(`explorer.exe /select,"${path}"`)
    },
    startAll(type='upload') {
      if (type === 'upload') {
        this.uploads.forEach(task => {
          this.$store.commit('common/updateTaskStatus', {task_id:task.task_id,status:'init'})
          PubSub.publish('upload', {id:task.task_id,status:'init'})
        })
      }
      if (type === 'download') {
        this.downloads.forEach(task => {
          this.$store.commit('common/updateTaskStatus', {task_id:task.task_id,status:'init'})
          PubSub.publish('download', {id:task.task_id,status:'init'})
        })
      }
    },
    pauseAll(type='upload') {
      if (type === 'upload') {
        this.uploads.forEach(task => {
          this.$store.commit('common/updateTaskStatus', {task_id:task.task_id,status:'pause'})
          PubSub.publish('upload', {id:task.task_id,status:'pause'})
        })
      }
      if (type === 'download') {
        this.downloads.forEach(task => {
          this.$store.commit('common/updateTaskStatus', {task_id:task.task_id,status:'pause'})
          PubSub.publish('download', {id:task.task_id,status:'pause'})
        })
      }
    },
    cancelAll(type='upload') {
      if (type === 'upload') {
        this.uploads.forEach(task => {
          this.$store.commit('common/updateTaskStatus', {task_id:task.task_id,status:'cancel'})
          PubSub.publish('upload', {id:task.task_id,status:'cancel'})
        })
      }
      if (type === 'download') {
        this.downloads.forEach(task => {
          this.$store.commit('common/updateTaskStatus', {task_id:task.task_id,status:'cancel'})
          PubSub.publish('download', {id:task.task_id,status:'cancel'})
        })
      }
    },
    async start(task, type='upload') {
      if (type === 'upload') {
        this.$store.commit('common/updateTaskStatus', {task_id:task.task_id,status:'init'})
        PubSub.publish('upload', {id:task.task_id,status:'init'})
      }
      if (type === 'download') {
        this.$store.commit('common/updateTaskStatus', {task_id:task.task_id,status:'init'})
        PubSub.publish('download', {id:task.task_id,status:'init'})
      }
    },
    pause(task, type='upload') {
      if (type === 'upload') {
        this.$store.commit('common/updateTaskStatus', {task_id:task.task_id,status:'pause'})
        PubSub.publish('upload', {id:task.task_id,status:'pause'})
      }
      if (type === 'download') {
        this.$store.commit('common/updateTaskStatus', {task_id:task.task_id,status:'pause'})
        PubSub.publish('download', {id:task.task_id,status:'pause'})
      }
    },
    cancel(task, type='upload') {
      if (type === 'upload') {
        this.$store.commit('common/updateTaskStatus', {task_id:task.task_id,status:'cancel'})
        PubSub.publish('upload', {id:task.task_id,status:'cancel'})
      }
      if (type === 'download') {
        this.$store.commit('common/updateTaskStatus', {task_id:task.task_id,status:'cancel'})
        PubSub.publish('download', {id:task.task_id,status:'cancel'})
      }
    }
  }
}
</script>

<style lang="scss" scoped>
  .transfer-wrapper {
    flex: 1;
    width: 100%;
    height: 100%;
    display: flex;
    .btn {
      width: 200px;
      height: 70px;
      display: flex;
      align-items: center;
      box-sizing: border-box;
      background-color: #fff;
      cursor:pointer;
      font-size: 22px;
      font-weight: 700;
      padding: 0px 10px;
    }
    .btn-active {
      background-color: rgb(18,95,177);
      color: #fff;
    }
    .right {
      width: calc(100% - 320px);
      height: 100%;
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
      padding: 0px 20px 20px 10px;
      .list-area {
        max-height: 780px;
        overflow-y: overlay;
        &::-webkit-scrollbar {
          width: 12px;
          background-color: var(--c_white);
        }
        &::-webkit-scrollbar-thumb {
          border-radius: 10px;
          background-color: var(--c_webkit-scrollbar-thumb);
        }
      }
      .list-item {
        display: flex;
        align-items: center;
        height: 65px;
        box-sizing: border-box;
        border-bottom: 1px solid rgb(214,221,231);
        padding: 0px 20px;
      }
      /deep/ .el-progress-bar__outer {
        border-radius: 0px;
      }
      /deep/ .el-progress-bar__inner {
        border-radius: 0px;
        .el-progress-bar__innerText {
          line-height: 19px;
          color: #ffffff !important;
        }
      }
      .icon-start-task {
        width: 22px;
        height: 22px;
        cursor: pointer;
        margin: 0px 15px;
        content: url('~@/assets/icons/icon-start-task.svg');
        &:hover {
          content: url('~@/assets/icons/icon-start-task-hover.svg');
        }
      }
      .icon-pause-task {
        width: 22px;
        height: 22px;
        cursor: pointer;
        margin: 0px 15px;
        content: url('~@/assets/icons/icon-pause-task.svg');
        &:hover {
          content: url('~@/assets/icons/icon-pause-task-hover.svg');
        }
      }
      .icon-close {
        width: 18px;
        height: 18px;
        cursor: pointer;
        margin: 0px 15px;
        content: url('~@/assets/icons/close-hover.svg');
        &:hover {
          content: url('~@/assets/icons/close-hover.svg');
        }
      }
      .icon-doc {
        width: 22px;
        height: 22px;
        cursor: pointer;
        margin: 0px 15px;
        content: url('~@/assets/icons/icon-folder.svg');
        &:hover {
          content: url('~@/assets/icons/icon-folder.svg');
        }
      }
    }
  }
</style>
