<template>
  <Dialog
    v-if="show"
    :show="show"
    :title="'删除目录'"
    :width="400"
    :loading="loading"
    showDefaultFooterContent
    @close="close"
    @cancel="close"
    @confirm="confirm">
    <div style="padding:10px 20px;font-size:16px">
      <Tooltip :tips="`删除目录:${inputData.data.name}`">
        <span>{{ `删除目录:${inputData.data.name}` }}</span>
      </Tooltip>
      <div style="margin:5px 0px;">{{ `该操作会同步删除子目录及包含的文件,确认删除?` }}</div>
    </div>
  </Dialog>
</template>
  
<script>
import {Dir,File} from '@/db/pg.js'
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
      loading: false
    }
  },
  mounted () {},
  created () {},
  watch: {},
  computed: {},
  methods: {
    appendNodeId(root, dstArr) {
      dstArr.push(root.id)
      if (root.children) {
        for (const child of root.children) {
          this.appendNodeId(child, dstArr)
        }
      }
      return
    },
    close() {
      this.loading = false
      this.$emit('update:show',false)
      this.$emit('update:inputData',{})
      this.$emit('close')
    },
    async confirm() {
      this.loading = true
      let ids = []
      this.appendNodeId(this.inputData.data, ids)
      console.log(this.inputData.data, ids)
      await Dir.delete(ids).then(res => {
        if (res.code !== 0) this.$message.error(`删除目录失败:${res.msg}`)
      })
      // 删除目录下文件
      await File.deleteByDirId(ids).then(res => {
        if (res.code !== 0) this.$message.error(`删除目录下文件失败:${res.msg}`)
      })
      this.$emit('success', this.inputData.data, ids)
      this.close()
    }
  }
}
</script>
  
<style lang='scss' scoped>
</style>