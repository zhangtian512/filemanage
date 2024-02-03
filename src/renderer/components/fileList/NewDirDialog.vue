<template>
  <Dialog
    v-if="show"
    :show="show"
    :title="'新建目录'"
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
  created () {},
  watch: {},
  computed: {
    enableSave() {
      if (!this.path) return false
      return true
    }
  },
  methods: {
    close() {
      this.loading = false
      this.path = ''
      this.$emit('update:show',false)
      this.$emit('update:inputData',{})
      this.$emit('close')
    },
    async confirm() {
      console.log(this.path, this.inputData)
      const reg = new RegExp("[`~!@#$^&*()=|{}':;',\\[\\].<>《》/?~！@#￥……&*（）——|{}【】‘；：”“'。，、？ ]")
      if (reg.test(this.path)) {
        this.$message.error('不能包含特殊字符')
        return
      }
      if (this.$store.state.common.dirData.find(item => {
        if (item.parent === this.inputData.data.id && item.name === this.path) return true
      })) {
        this.$message.error('同级目录下重名')
        return
      }
      this.loading = true
      const data = {
        name: this.path,
        parent: this.inputData.data.id,
        creator: localStorage.getItem('username')
      }
      await Dir.new(data).then(res => {
        if (res.code !== 0) this.$message.error(`新建目录失败:${res.msg}`)
        else {
          if (res.data.rows[0] && res.data.rows[0].id) {
            const newId = res.data.rows[0].id
            this.$emit('success', {id:newId,name:this.path,parent:this.inputData.data.id,children:[]}, this.inputData.data.id)
          }
        }
      }).finally(() => {this.close()})
    }
  }
}
</script>
  
<style lang='scss' scoped>
</style>