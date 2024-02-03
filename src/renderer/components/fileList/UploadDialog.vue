<template>
  <Dialog
    v-if="show"
    :show="show"
    :title="'上传文件'"
    :width="1100"
    :enableSave="enableSave"
    showDefaultFooterContent
    @close="close"
    @cancel="close"
    @confirm="confirm">
    <div style="padding:10px 20px;">
      <div>
        <div style="font-size:18px;font-weight:700;margin-bottom:10px;">{{ `上传路径：${currSelDir?currSelDir:'/'}` }}</div>
        <div class="choose-file-btn" @click="$refs.refUpload.click()">点击选择上传文件</div>
        <input
          v-show="false"
          ref="refUpload"
          type="file"
          @change="fileChange"/>
        <div v-if="files.length>0" style="font-size:16px;">
          <el-row :gutter="10">
            <el-col :span="8" style="display:flex;margin-bottom:8px">
              <div style="flex:1;text-align:right;">文件名：</div>
              <Tooltip :tips="files.map(item=>item.name)" style="width:200px">
                <span>{{ files.map(item=>item.name).join() }}</span>
              </Tooltip>
            </el-col>
            <el-col :span="8" style="display:flex;margin-bottom:8px">
              <div style="flex:1;text-align:right;">大小：</div>
              <Tooltip :tips="files.map(item=>calcFileSize(item.size))" style="width:200px">
                <span>{{ files.map(item=>calcFileSize(item.size)).join() }}</span>
              </Tooltip>
            </el-col>
            <el-col :span="8" style="display:flex;margin-bottom:8px">
              <div style="flex:1;text-align:right;">类型：</div>
              <Tooltip :tips="files.map(item=>item.type)" style="width:200px">
                <span>{{ files.map(item=>item.type).join() }}</span>
              </Tooltip>
            </el-col>
            <el-col v-for="item,index in labels" :key="index" :span="8" style="display:flex;align-items:center;margin-bottom:8px">
              <div style="flex:1;text-align:right;">{{ `${item.name}：` }}</div>
              <el-input v-if="item.type!=='date'" v-model.trim="item.value" style="width:200px" size="small" />
              <el-date-picker
                v-if="item.type==='date'"
                v-model="item.value"
                type="datetime"
                style="width:200px"
                size="small"
                placeholder="选择日期时间"
                :default-value="new Date()"
                value-format="yyyy-MM-dd HH:mm:ss" />
            </el-col>
          </el-row>
        </div>
      </div>
    </div>
  </Dialog>
</template>
  
<script>
import { calcFileSize } from '@/util/index.js'
import { chunkSize } from '@/config'
import { Task,Label } from '@/db/pg.js'
import { File } from '@/db/pg.js'
import axios from "axios"

export default {
  name: '',
  components: {},
  props: {
    show:{type:Boolean,default:false},
    currSelDirId:{type:Number,default:''},
    currSelDir:{type:String,default:''}
  },
  data () {
    return {
      files: [],
      labels: []
    }
  },
  mounted () {},
  created () {
    this.getLabels()
  },
  watch: {},
  computed: {
    enableSave() {
      if (this.files.length===0) return false
      return true
    }
  },
  methods: {
    calcFileSize,
    getLabels() {
      Label.getAll().then(res => {
        if (res.code !== 0) this.$message.error(`获取标签失败:${res.msg}`)
        else {
          this.labels = res.data
        }
      }).catch(err => {
        console.log(err)
        this.$message.error(`获取标签失败:${err}`)
      })
    },
    checkFile() {
      return new Promise(resolve => {
        File.getAll().then(res => {
          if (res.code !== 0) {
            return resolve(`文件校验失败:${res.msg}`)
          } else {
            const dirFiles = res.data.filter(file => {
              if (file.file_dir_id !== this.currSelDirId) return false
              return true
            })
            const findRes = dirFiles.find(file => {
              if (this.files.find(item => {return item.name === file.file_name})) return true
              return false
            })
            resolve(findRes?`该文件夹下有同名文件:${findRes.file_name}`:null)
          }
        }).catch(err => {
          return resolve(`文件校验失败:${err}`)
        })
      })
    },
    checkTask(file) {
      return new Promise(resolve => {
        let err = ''
        // 如果正在进行的任务中是否有同名同路径的文件
        const runningTasks = this.$store.state.common.tasks.filter(task => {
          return task.task_type==='upload'
                  && !['completed','error'].includes(task.status)
                  && file.name===task.file_name
                  && this.currSelDirId===task.file_dir_id
        })
        console.log('@@@@@@@@@@@@@@@@@@@@@@@ runningTasks:', runningTasks)
        if (runningTasks.length>0) {
          // 先将当前任务关闭
          err = `文件已经处于上传队列中:${file.name}`
          // 如果处于暂停则触发该任务
          const pauseTask = runningTasks.find(item => item.status==='pause')
          if (pauseTask) PubSub.publish('upload', {id:pauseTask.task_id,status:'init'})
        }
        resolve(err)
      })
    },
    fileChange(evt) {
      // console.log(evt.target.files)
      if (evt.target.files.length > 5) this.$message.error('一次最多同时选择5个文件')
      else {
        this.files = []
        for (const file of evt.target.files) {
          // if(!['image/jpeg','image/jpg','image/bmp','image/svg+xml','image/png','image/gif','video/mp4','video/x-msvideo','video/vnd.rn-realmedia-vbr','video/quicktime'].includes(file.type)) {
          //   this.$message.warining(`不支持的文件格式:${file.name}`)
          //   continue
          // }
          this.files.push(file)
        }
      }
      console.log(this.files)
      this.$refs.refUpload.value = null
    },
    close() {
      this.files = []
      this.$emit('update:show',false)
    },
    async confirm() {
      let err = await this.checkFile()
      if (err) return this.$message.error(err)
      this.files.forEach(async file => {
        err = await this.checkTask(file)
        if (err) return this.$message.warning(err)
        let labels = {}
        this.labels.forEach(item => {
          if (item.value) {
            labels[item.name] = item
          }
        })
        const newTask = {
          task_id: `${new Date().getTime()}-${file.name}`,
          task_type: 'upload',
          file_id: null,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          file_path: file.path,
          file_dir_id: this.currSelDirId,
          file_info: JSON.stringify(labels),
          file_db_key: null,
          file: null,
          progress: 0,
          total_chunk_num: file.size>0?Math.ceil(file.size/chunkSize):0,
          finished_chunk_num: 0,
          canceler: axios.CancelToken.source(),
          status: 'init'
        }
        this.$store.commit('common/appendTasks', [newTask])
        Task.new(newTask)

        PubSub.publish('upload', {id:newTask.task_id,status:'init'})
      })
      this.close()
    }
  }
}
</script>
  
<style lang='scss' scoped>
  .choose-file-btn {
    width: 130px;
    height: 30px;
    line-height:30px;
    border: 1px solid #e6e6e6;
    cursor: pointer;
    font-size: 14px;
    text-align: center;
    margin-bottom: 10px;
    &:hover {
      border: 1px solid var(--c_blue);
      color: var(--c_blue);
    }
  }
</style>