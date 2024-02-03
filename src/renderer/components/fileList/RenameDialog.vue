<template>
  <Dialog
    v-if="show"
    :show="show"
    :title="'重命名目录'"
    :width="300"
    :loading="loading"
    :enableSave="enableSave"
    showDefaultFooterContent
    @close="close"
    @cancel="close"
    @confirm="confirm">
    <div style="padding: 10px 20px;">
      <div style="margin-bottom:5px">请输入目录名称</div>
      <el-input v-model.trim="path" :maxlength="64"/>
    </div>
  </Dialog>
</template>
  
<script>
import {Dir} from '@/db/pg.js'
export default {
  name: '',
  components: {},
  props: {
    show:{type: Boolean,default:false},
    inputData:{type: Object,default:() => {
      return {}
    }}
  },
  data () {
    return {
      loading: false,
      path: ''
    }
  },
  mounted () {},
  created () {
    if (this.inputData && this.inputData.data) this.path = this.inputData.data.name
  },
  watch: {},
  computed: {
    enableSave() {
      if (!this.path) return false
      if (this.inputData.data.name === this.path) return false
      return true
    }
  },
  methods: {
    close() {
      this.loading = false
      this.path = ''
      this.$emit('update:show',false)
      this.$emit('update:inputData',{})
    },
    async confirm() {
      // console.log(this.path, this.inputData)
      const reg = new RegExp("[`~!@#$^&*()=|{}':;',\\[\\].<>《》/?~！@#￥……&*（）——|{}【】‘；：”“'。，、？ ]")
      if (reg.test(this.path)) {
        this.$message.error('不能包含特殊字符')
        return
      }
      const currNode = this.inputData.data
      if (this.$store.state.common.dirData.find(item => {
        if (item.id !== currNode.id && item.parent === currNode.parent && item.name === this.path) return true
      })) {
        this.$message.error('同级目录下重名')
        return
      }
      this.loading = true
      const data = {
        id: this.inputData.data.id,
        name: this.path,
        parent: this.inputData.data.parent,
        creator: localStorage.getItem('username')
      }
      await Dir.update(data).then(res => {
        if (res.code !== 0) this.$message.error(`重命名失败:${res.msg}`)
        else this.$emit('success', {...data})
      }).finally(() => {this.close()})
    }
  }
}
</script>
  
<style lang='scss' scoped>
</style>