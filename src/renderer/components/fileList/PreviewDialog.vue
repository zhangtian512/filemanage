<template>
  <Dialog
    v-if="show"
    :show="show"
    :title="title"
    :width="1400"
    hideFooter
    @close="close">
    <div
      v-loading="loading"
      style="display:flex;align-items:center;justify-content:center;box-sizing:border-box;padding:5px;width:100%;height:700px;position:relative;">
      <img 
        v-if="type==='pic'"
        :src="url"
        style="height:100%;"/>
      <video
        v-if="type==='video'"
        id="previewPlayer"
        class="video-js vjs-fill vjs-big-play-centered"
        autoplay
        style="width:100%;height:100%" />
    </div>
  </Dialog>
</template>
  
<script>
import videojs from 'video.js'

export default {
  name: '',
  components: {},
  props: {
    show:{type: Boolean,default:false},
    url:{type: String,default:null},
    type:{type: String,default:null},
    dataType:{type: String,default:null},
  },
  data () {
    return {
      loading: false,
      player: null
    }
  },
  mounted () {
    if (this.type === 'video') this.initVideo(this.url)
  },
  created () {},
  watch: {},
  computed: {
    title() {
      switch (this.type) {
        case 'video':
          return '视频预览'
        case 'pic':
          return '图片预览'
        default:
          return '预览'
      }
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
    initVideo(url) {
      if (!url) return
      let self = this
      let previewPlayer = document.getElementById(`previewPlayer`)
      self.loading = true
      const options = {
        autoplay: false,
        controls: true,
        muted: false,
        controlBar: {
          // 隐藏静音按钮
          volumePanel: false,
          // 隐藏最大化按钮
          fullscreenToggle: false,
        },
        sources: [
          {
            src: url,
            type: "",
            poster: ''
          }
        ]
      }
      this.player = videojs(previewPlayer, options, function OnReady () {
        console.log('视频加载完毕')
        console.log('video src:', this.options().sources[0].src)
        console.log('video type:', this.options().sources[0].type)
        self.loading = false
      })
      this.player.on('ready', function( e ) {
        console.log('ready回调函数:',e)
        self.$emit('eventCallBack', 'ready')
        // this.play()
      })
      this.player.on('play', function( e ) {
        console.log('play回调函数:',e)
        self.$emit('eventCallBack', 'play')
      })
      this.player.on('pause', function( e ) {
        console.log('pause回调函数:',e)
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
    }
  }
}
</script>
  
<style lang='scss' scoped>
</style>