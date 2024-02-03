<template>
  <div class="context-menu-wrapper" :style="style">
    <ul v-if="show" style="list-style-type:none;border:1px solid #E7E7E7;padding:0px;margin:0px">
      <li
        class="divider menu-item"
        v-for="item,index in menuItems" :key="index"
        style=""
        @click="onClick($event, item)">
        {{ item.label }}
      </li>
    </ul>
  </div>
</template>
  
<script>
export default {
  name: '',
  components: {},
  props: {
    show:{type:Boolean,default:false},
    autoClose:{type:Boolean,default:true},
    position:{
      type:Object,
      default: () => {
        return {
          left: null,
          top: null
        }
      }
    },
    menuItems: {
      type: Array,
      default: () => {
        return [
          {value: 'download',label: '下载'},
          {value: 'preview',label: '预览'},
          {value: 'delete',label: '删除'}
        ]
      }
    }
  },
  data () {
    return {}
  },
  mounted () {},
  created () {
    document.onclick = () => {
      this.onClose()
    }
  },
  watch: {},
  computed: {
    style() {
      let res = {}
      if (this.position.left) res.left = this.position.left
      if (this.position.top) res.top = this.position.top
      return res
    }
  },
  methods: {
    onClick(e, item) {
      // console.log(e, item)
      e.stopPropagation()
      this.$emit('item-click', item)
      this.onClose()
    },
    onClose(){
      this.$emit('close')
      if(this.autoClose) this.$emit('update:show',false)
    }
  }
}
</script>
  
<style lang='scss' scoped>
.context-menu-wrapper {
  z-index: 9999;
  position:absolute;
  -webkit-app-region: no-drag;
  background-color: #ffffff;
  font-size: 14px;
  .menu-item {
    min-width: 96px;
    height: 32px;
    line-height: 32px;
    text-align: center;
    cursor: pointer;
  }
  .menu-item:hover {
    background-color: rgba(18,150,219,0.1);
  }
  .menu-item:active {
    background-color: rgba(18,150,219,0.1);
  }
}
</style>