<template>
  <Dialog
    v-if="show"
    :show="show"
    :loading="loading"
    title="视频编辑"
    :width="1400"
    @close="close">
    <div style="width:100%">
      <video
        v-if="this.videoId&&!loading"
        :id="`videoPlayer-${this.videoId}`"
        class="video-js vjs-fill vjs-big-play-centered"
        style="width:100%;height:500px" />
      <el-progress :percentage="progress" text-inside :stroke-width="18" style="width:100%;"></el-progress>
      <div style="display:flex;align-items:center;margin:10px 0px;padding:0px 10px">
        <div>选择剪裁时间：</div>
        <el-input v-model="timerange[0]" placeholder="起始时间" size="small" style="width:84px"></el-input>
        <div style="margin:0px 10px">至</div>
        <el-input v-model="timerange[1]" placeholder="结束时间" size="small" style="width:84px"></el-input>
        <div style="margin-left:10px">输出分辨率：</div>
        <el-input v-model.trim="videoWidth" size="small" style="width:62px;margin-right:5px"></el-input>
        <el-input v-model.trim="videoHeight" size="small" style="width:62px"></el-input>
        <div style="margin-left:10px">输出帧率：</div>
        <el-input v-model.trim="fps" size="small" style="width:50px"></el-input>
        <Button :disable="!canSave" type="primary" @click="saveResult" size="mini" style="padding:5px 10px;margin-left:20px;">
          <div style="margin-right:4px" class="icon-download"></div>
          <span>保存结果</span>
        </Button>
      </div>
    </div>
  </Dialog>
</template>
  
<script>
import videojs from 'video.js'
import path from 'path'
import { fmtDate,timeToTs } from '@/util'
import ffmpeg from 'fluent-ffmpeg'

export default {
  name: '',
  components: {},
  props: {
    show:{type: Boolean,default:false},
    src:{type: String,default:''},
    type:{type: String,default:''}
  },
  data () {
    return {
      loading: false,
      processing: false,
      player: null,
      videoId: null,
      videoUrl: '',
      videoType: '',
      totalTs: 0,
      progress: 0,
      timerange: [],
      videoWidth: 0,
      videoHeight: 0,
      fps: 0
    }
  },
  mounted () {
    this.initVideo(this.src, this.type)
  },
  created () {
    if (this.src) this.videoUrl = this.src
    if (this.type) this.videoType = this.type
    this.videoId = Math.ceil(Math.random()*1000).toString()
    console.log('process.env.FLUENTFFMPEG_COV:', process.env.FLUENTFFMPEG_COV)
  },
  watch: {},
  computed: {
    canSave() {
      console.log('this.processing:', this.processing)
      console.log('this.loading:', this.loading)
      if (!this.timerange[0]||!this.timerange[1]) return false
      if (this.totalTs === 0) return false
      if (this.processing || this.loading) return false
      if (!this.fps || this.fps === 0) return false
      if (!this.videoWidth || this.videoWidth === 0 || !this.videoHeight || this.videoHeight === 0) return false
      return true
    }
  },
  methods: {
    close() {
      if (this.player) {
        console.log('销毁video')
        this.player.dispose()
        this.player = null
      }
      this.$emit('update:show',false)
    },
    initVideo(src, type) {
      if (!src) return
      const id = `videoPlayer-${this.videoId}`
      let videoPlayer = document.getElementById(id)
      let self = this
      self.loading = true
      self.processing = true
      const options = {
				autoplay: false,
				controls: true,
        muted: true,
				sources: [
					{
						src: src,
						type: type?type:'',
            poster: ''
					}
				]
			}
      this.player = videojs(videoPlayer, options, function OnReady () {
        console.log('视频加载完毕')
        console.log('video src:', this.options().sources[0].src)
        console.log('video type:', this.options().sources[0].type)

        const ffprobePath = process.env.NODE_ENV!=='production'?path.join(__dirname, './ffprobe.exe'):path.join(__dirname, './ffprobe.exe')
        console.log(ffprobePath)
        ffmpeg(self.videoUrl)
        .setFfprobePath(ffprobePath)
        .ffprobe(self.videoUrl, function(err, metadata) {
          console.log(err, metadata)
          if (err) self.$message.error('加载视频信息失败:', err)
          else {
            self.totalTs = metadata.streams[0].duration
            self.videoWidth = metadata.streams[0].width
            self.videoHeight = metadata.streams[0].height
            self.fps = Number(metadata.streams[0].avg_frame_rate.split('/')[0])
            console.log(`totalTs:${self.totalTs} videoWidth:${self.videoWidth} 
                        videoHeight:${self.videoHeight} fps:${self.fps}`)
            const startTs = new Date()
            startTs.setHours(0)
            startTs.setMinutes(0)
            startTs.setSeconds(0)
            startTs.setMilliseconds(0)
            const endTs = new Date(startTs.getTime()+self.totalTs*1000)
            self.timerange.push(fmtDate(startTs, 'HH:MM:SS'), fmtDate(endTs, 'HH:MM:SS'))
          }
          self.processing = false
        })
        self.loading = false
        // this.play()
      })
      this.player.on('play', function( e ) {
        console.log('开始播放回调函数:',e)
        self.$emit('eventCallBack', 'play')
      })
      this.player.on('pause', function( e ) {
        console.log('暂停播放回调函数:',e)
        self.$emit('eventCallBack', 'pause')
      })
      this.player.on('error', function( e ) {
        console.log('视频出错:',e)
        self.$emit('eventCallBack', 'error')
      })
      this.player.on('stalled', function( e ) {
        console.log('视频 stalled 事件:',e)
        self.$emit('eventCallBack', 'stalled')
      })
      this.player.on('loadstart', function () {
        console.log('视频 loadstart 事件')
        self.$emit('eventCallBack', 'loadstart')
      })
      this.player.on('click', function (event) {
        console.log('视频 click 事件')
        event.preventDefault()
        self.$emit('eventCallBack', 'click')
      })
    },
    saveResult() {
      let self = this
      // 加载视频
      const ffmpegPath = process.env.NODE_ENV!=='production'?path.join(__dirname, './ffmpeg.exe'):path.join(__dirname, './ffmpeg.exe')
      console.log(ffmpegPath)
      // let outputStream = fs.createWriteStream(path.join(__dirname,'output.mp4'))
      const startTs = timeToTs(self.timerange[0])
      const duration = timeToTs(self.timerange[1]) - startTs
      self.processing = true
      self.progress = 0
      ffmpeg(this.videoUrl)
      .setFfmpegPath(ffmpegPath)
      .videoCodec('libx264')
      .size(`${self.videoWidth}x${self.videoHeight}`)
      .fps(Number(self.fps))
      .on("start", function (e) {
        console.log("start:", e)
      })
      .on("error", function (err, stdout, stderr) {
        self.processing = false
        console.log('error:', err)
        console.log('error stdout:', stdout)
        console.log('error stderr:', stderr)
      })
      .on('progress', function(progress) {
        console.log("progress:", progress)
        const time = progress.timemark.split('.')[0]
        self.progress = Math.round(timeToTs(time)*100/duration)
      })
      .on("end", function (stdout, stderr) {
        self.processing = false
        self.progress = 100
        console.log('end stdout:', stdout)
        // console.log('end stderr:', stderr)
      })
      .seekInput(startTs)
      .duration(duration)
      .save('output.mp4')
      .run()
    }
  }
}
</script>
  
<style lang='scss' scoped>
/deep/ .el-progress-bar__outer {
  border-radius: 0px;
}
/deep/ .el-progress-bar__inner {
  border-radius: 0px;
  .el-progress-bar__innerText {
    line-height: 19px;
  }
}
</style>