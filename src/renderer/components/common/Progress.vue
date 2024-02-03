<template>
  <div class="progress-bg" :style="{height:`${strokeWidth}px`,backgroundColor:bgColor}">
    <div ref="refProgressBar" class="progress-bar" :style="{width:`${percentage}%`,backgroundColor:color}">
      {{ `${percentage}%` }}
    </div>
  </div>
</template>
  
<script>
export default {
  name: '',
  components: {},
  props: {
    percentage:{type:Number},
    strokeWidth:{type:Number,default:18},
    bgColor:{type:String,default:'rgb(235, 238, 245)'},
    color:{type:String,default:'#409EFF'}
  },
  data () {
    return {}
  },
  mounted () {},
  created () {},
  watch: {},
  computed: {},
  methods: {}
}
</script>
  
<style lang='scss' scoped>
.progress-bg{
  width: 100%;
  position: relative;
  .progress-bar {
    height: 100%;
    color: #fff;
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    transition: width .1s ease;
  }
}
</style>