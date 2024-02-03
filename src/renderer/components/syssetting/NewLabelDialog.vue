<template>
  <Dialog
    v-if="show"
    :show="show"
    :title="isEdit?'编辑标签':'新增标签'"
    :width="350"
    :loading="loading"
    :enableSave="enableSave"
    showDefaultFooterContent
    @close="close"
    @cancel="close"
    @confirm="confirm">
    <div style="padding: 20px 20px;">
      <el-form :model="formData" :rules="rules" ref="labelForm" label-width="60px">
        <el-form-item prop="name" label="名称" style="margin-bottom: 20px;">
          <el-input v-model.trim="formData.name" placeholder="请输入"></el-input>
        </el-form-item>
        <el-form-item prop="type" label="类型">
          <el-select v-model="formData.type" placeholder="请选择" style="width:100%">
            <el-option
              v-for="item,index in [{label:'字符串',value:'string'},{label:'数字',value:'number'},{label:'日期',value:'date'}]"
              :key="index" :label="item.label" :value="item.value"></el-option>
          </el-select>
        </el-form-item>
      </el-form>
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
    editData:{type: Object,default:()=>{return {}}},
    isEdit:{type: Boolean,default:false}
  },
  data () {
    return {
      loading: false,
      formData: {
        name: '',
        type: '',
        is_default: 0
      },
      originFormData: {
        name: '',
        type: '',
        is_default: 0
      },
      rules: {
        name: [
          { required: true, message: '不能为空', trigger: 'blur' },
          { validator: this.validateName, trigger: 'blur' }
        ],
        type: [
          { required: true, message: '必选', trigger: 'blur' }
          
        ]
      },
    }
  },
  mounted () {},
  created () {
    if (this.isEdit) {
      this.formData = JSON.parse(JSON.stringify(this.editData))
      this.originFormData = JSON.parse(JSON.stringify(this.editData))
    }
  },
  watch: {},
  computed: {
    enableSave() {
      if (JSON.stringify(this.formData) === JSON.stringify(this.originFormData)) return false
      return true
    }
  },
  methods: {
    close() {
      this.loading = false
      this.$emit('update:show',false)
      this.$emit('close')
    },
    validateName(rule, value, callback) {
      if (value === '') callback(new Error('不能为空'))
      else if (value.length<2 || value.length>8) callback(new Error('请输入2-8长度的名称'))
      else {
        const regex = new RegExp(/[`~!#$%^&*()_\+=<>?:"{}|~！#￥%……&*（）={}|《》？：“”【】、；‘’，。、\s+]/g)
        if (regex.test(value)) callback(new Error('不能输入特殊字符'))
        else callback()
      }
    },
    confirm() {
      this.$refs.labelForm.validate(async valid=>{
        if (valid) {
          let promise = null
          let errTip = ''
          let succTip = ''
          if (this.isEdit) {
            promise = Label.update(this.formData)
            errTip = '修改失败'
            succTip = '修改成功'
          } else {
            promise = Label.new(this.formData)
            errTip = '新增失败'
            succTip = '新增成功'
          }
          this.loading = true
          await promise.then(res => {
            if (res.code !== 0) this.$message.error(`${errTip}:${res.message}`)
            else {
              this.$message.success(succTip)
              this.close()
              this.$emit('success')
            }
          }).catch(err => {
            this.$message.error(`${errTip}:${err}`)
          })
          this.loading = false
        }
      })
    }
  }
}
</script>
  
<style lang='scss' scoped>
/deep/ .el-form-item__label {
  font-size: 16px;
  font-weight: 700;
}
/deep/ .el-form-item {
  margin-bottom: 0px;
}
</style>