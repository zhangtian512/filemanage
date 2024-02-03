<template>
  <Dialog
    v-if="show"
    :show="show"
    :title="'删除标签'"
    :width="400"
    :loading="loading"
    showDefaultFooterContent
    @close="close"
    @cancel="close"
    @confirm="confirm">
    <div style="padding: 18px 20px;">
      <div style="font-size:18px;">确定要删除标签吗?</div>
    </div>
  </Dialog>
</template>
  
<script>
import {Label} from '@/db/pg.js'

export default {
  name: '',
  components: {},
  props: {
    show:{type: Boolean,default:false},
    inputData:{type: Array,default:() => {
      return []
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
    close() {
      this.loading = false
      this.$emit('update:show',false)
      this.$emit('update:inputData',[])
      this.$emit('close')
    },
    async confirm() {
      this.loading = true
      await Label.delete(this.inputData).then(res => {
        if (res.code !== 0) this.$message.error(`删除失败:${res.message}`)
        else {
          this.$message.success('删除成功')
          this.$emit('success')
        }
      }).catch(err => {
        this.$message.error(`删除失败:${err}`)
      })
      this.loading = false
      this.close()
    }
  }
}
</script>
  
<style lang='scss' scoped>
</style>