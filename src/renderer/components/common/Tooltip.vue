<template>
  <el-tooltip
    :visible-arrow="arrowShow"
    :placement="position"
    :disabled="state"
    effect="light"
    popper-class="adv-tooltip"
    :hideAfter="hideAfter"
    :offset="offset"
    :tabindex="-1">
    <div slot="content" v-if="ctmTips">
      <slot name="extTips"></slot>
    </div>
    <div v-else :style="{width: `${width}px`}" slot="content">
      <span class="tipPrefix" :style="{color: tipPrefixColor}">{{tipPrefix}}</span>
      <div v-if="tipsType==='String'">{{ tips }}</div>
      <div v-if="tipsType==='Object'">
        <div v-for="item,index in Object.keys(tips)" :key="index">
          {{ `${item}:${tips[item]}` }}
        </div>
      </div>
      <div v-if="tipsType==='Array'">
        <div v-for="item,index in tips" :key="index">
          {{ item }}
        </div>
      </div>
    </div>
    <div
       ref="toolTipDivRef" 
      @mouseover="isTextOverflow($event)"
      :style="{
        overflow:'hidden',
        display: lineClamp>0?'-webkit-box':'flex',
        width: `${cWidth}px`,
        lineClamp:lineClamp>0?lineClamp:null, // 可通过lineClamp设置超出两行再显示省略号
        whiteSpace: lineClamp>0?'normal':null,
        wordWrap: lineClamp>0?'normal':null,
        boxOrient: lineClamp>0?'vertical':null,
      }"
    >
      <span longtxt ref="toolTipSpanRef"><slot></slot></span>
    </div>
  </el-tooltip>
</template>

<script>
export default {
  name: '',
  components: {},
  data () {
    return {
      position: this.placement,
      isOverflow: true
    }
  },
  props: {
    hideAfter: {
      type: Number,
      required: false,
      default: 3000
    },
    ctmTips: {
      type: Boolean,
      required: false,
      default: false
    },
    arrowShow: {
      type: Boolean,
      required: false,
      default: true
    },
    disable: {
      type: Boolean,
      required: false,
      default: false
    },
    placement: {
      type: String,
      required: false,
      default: 'top'
    },
    tipPrefix: {
      type: String,
      required: false,
      default: ''
    },
    tipPrefixColor: {
      type: String,
      required: false,
      default: '#008cd6'
    },
    tips: {
      type: [String,Array,Object],
      required: false,
      default: ''
    },
    width: {
      type: Number,
      required: false,
      default: null
    },
    cWidth: {
      type: Number,
      required: false,
      default: null
    },
    offset: {
      type: Number,
      required: false,
      default: 0
    },
    divFlag: {
      type: String,
      required: false,
      default: ''
    },
    minWidth:{
      type: Number,
      required: false,
      default: 10
    },
    lineClamp: {
      type: Number,
      required: false,
      default: 0
    },
    keep:{
      type: Boolean,
      required: false,
      default: false
    },
  },
  computed: {
    state () {
      return !this.keep && (this.disable || !this.isOverflow || this.tips === null) 
    },
    tipsType() {
      if (this.tips instanceof Array) return 'Array'
      if (this.tips instanceof Object) return 'Object'
      if (typeof(this.tips)==='string') return 'String'
      return ''
    }
  },
  watch: {},
  created () {},
  mounted () {},
  methods: {
    isTextOverflow (e) {
    //   let slotDiv = e.target
    //   if (slotDiv !== null) {
    //     let scrollWidth = slotDiv.scrollWidth
    //     let clientWidth = slotDiv.clientWidth
    //     if (clientWidth < scrollWidth) this.isOverflow = true
    //     else this.isOverflow = false
    //   }
      let ref1 = this.$refs.toolTipDivRef
      let ref2 = this.$refs.toolTipSpanRef
      if (ref1 && ref2) {
        let clientWidth = ref1.clientWidth
        let scrollWidth = ref2.scrollWidth
        if (clientWidth <= scrollWidth) this.isOverflow = true
        else this.isOverflow = false
      }
    }
  }
}
</script>

<style lang="scss">
.adv-tooltip {
  border: none !important;
  border-radius: 0;
  font-size: 12px;
  color: #787878;
  box-shadow: 0 0 8px #787878;
  max-width: 1200px !important;
  .popper__arrow {
    border: none !important;
  }
}
.tipPrefix {
  font-size: 12px;
  font-weight: bold;
  font-style: normal;
  font-stretch: normal;
  line-height: normal;
  letter-spacing: normal;
}
</style>
