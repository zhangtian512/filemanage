<template>
  <div style="height:100%;box-sizing:border-box;padding:0px 20px 20px 20px;" v-loading="loading">
    <TableCard :showFooter="false" style="border-radius:12px;box-shadow:0 0 10px 5px rgba(204, 216, 228, 1);">
      <template slot="title">
        <div>基本设置</div>
      </template>
      <div style="display:flex;box-sizing:border-box;padding:10px 0px;">
        <div style="width:110px;text-align:right;font-size:17px;font-weight:700;margin-right:20px;">修改密码:</div>
        <div>
          <el-form :model="editPassData" :rules="rules" ref="editPassForm" label-width="0px">
            <el-form-item prop="oldPass">
              <div style="display:flex;align-items:center;height:100%;position:relative;">
                <el-input v-model.trim="editPassData.oldPass" :type="showOldPass?'':'password'" class="pass-input" placeholder="旧密码"></el-input>
                <div class="show-eye">
                  <img v-if="!showOldPass" src="@/assets/icons/icon-eye-hide.svg" @click="showOldPass=true"/>
                  <img v-else src="@/assets/icons/icon-eye-show.svg" @click="showOldPass=false"/>
                </div>
              </div>
            </el-form-item>
            <el-form-item prop="newPass">
              <div style="display:flex;align-items:center;height:100%;position:relative;">
                <el-input v-model.trim="editPassData.newPass" :type="showOldPass?'':'password'" class="pass-input" placeholder="新密码"></el-input>
                <div class="show-eye">
                  <img v-if="!showNewPass" src="@/assets/icons/icon-eye-hide.svg" @click="showNewPass=true"/>
                  <img v-else src="@/assets/icons/icon-eye-show.svg" @click="showNewPass=false"/>
                </div>
              </div>
            </el-form-item>
          </el-form>
          <div style="display:flex;align-items:center;justify-content:flex-end;height:40px;font-size:16px;">
            <div class="txt-btn txt-btn-cancel" style="margin-right:10px;" @click="passCancel">取消</div>
            <div :class="['txt-btn',!enableSave?'txt-btn-disable':'']" @click="passConfirm">确定</div>
          </div>
        </div>
      </div>
      <div style="display:flex;box-sizing:border-box;padding:10px 0px;">
        <div style="width:110px;text-align:right;font-size:17px;font-weight:700;margin-right:20px;">文件标签:</div>
        <div style="width:800px">
          <Button type="primary" @click="isEdit=false;newLabelDialog=true" size="mini" :borderRadius="'24px'"
          style="padding:11px 24px 8px 24px;margin-bottom:20px;border:none;background:linear-gradient(to bottom right, rgba(8,164,161,0.7),rgba(8,164,161,1));box-shadow:0px 2px 1px 0px rgb(4,126,127);">
            <div style="margin-right:16px" class="icon-plus"></div>
            <span style="color:#fff;font-size:19px;font-weight:700;">新建标签</span>
          </Button>
          <el-table
            ref="labelTbl"
            :data="labels"
            :row-style="{height:'48px'}"
            height="484px"
            size="mini"
            style="width:100%;" 
            tooltip-effect="light" empty-text=""
            stripe>
            <el-table-column prop="name" label="标签名称" show-overflow-tooltip :align="'center'"/>
            <el-table-column prop="type" label="标签类型" :formatter="labelTypeFmt" show-overflow-tooltip :align="'center'"/>
            <el-table-column prop="is_default" label="系统预制" :formatter="defaultFmt" show-overflow-tooltip :align="'center'"/>
            <el-table-column label="操作" :align="'left'" width="90">
              <template slot-scope="{row}">
                <div style="display:flex;justify-content:center;">
                  <div v-if="!row.is_default" class="icon-edit" @click="newLabelDialog=true;isEdit=true;editData=row"></div>
                  <div v-if="!row.is_default" class="icon-delete" @click="delLabelDialog=true;delData=[row.id]"></div>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>
        <DelLabelDialog v-if="delLabelDialog" :show.sync="delLabelDialog" :inputData="delData" @success="getLabels" />
        <NewLabelDialog v-if="newLabelDialog" :show.sync="newLabelDialog" :is-edit="isEdit" :edit-data="editData" @success="getLabels"/>
      </div>
    </TableCard>
  </div>
</template>
  
<script>
import {User,Label} from '@/db/pg.js'
import DelLabelDialog from './DelLabelDialog.vue'
import NewLabelDialog from './NewLabelDialog.vue'

export default {
  name: '',
  components: {NewLabelDialog,DelLabelDialog},
  props: {},
  data () {
    return {
      loading: false,
      showOldPass: false,
      showNewPass: false,
      editPassData: {
        oldPass: '',
        newPass: ''
      },
      rules: {
        oldPass: [
          { required: true, message: '不能为空', trigger: 'blur' }
        ],
        newPass: [
          { required: true, message: '不能为空', trigger: 'blur' },
          { validator: this.validatePass, trigger: 'blur' }
        ]
      },
      labels: [],
      delLabelDialog: false,
      delData: [],
      newLabelDialog: false,
      editData: {},
      isEdit: false
    }
  },
  mounted () {},
  created () {
    this.getLabels()
  },
  watch: {},
  computed: {
    enableSave() {
      if (!this.editPassData.oldPass || !this.editPassData.newPass) return false
      return true
    },
    enableSaveLabel() {
      return true
    }
  },
  methods: {
    labelTypeFmt(row, column, cellValue, index) {
      if (cellValue === 'string') return '字符串'
      if (cellValue === 'number') return '数字'
      if (cellValue === 'date') return '日期'
      return ''
    },
    defaultFmt(row, column, cellValue, index) {
      return cellValue?'是':'否'
    },
    validatePass(rule, value, callback) {
      if (value === '') callback(new Error('不能为空'))
      else if (value.length<6 || value.length>20) callback(new Error('请输入6-20长度的密码'))
      else if (this.editPassData.oldPass === this.editPassData.newPass) callback(new Error('新旧密码相同'))
      else {
        const regex = new RegExp(/[`~!#$%^&*()_\+=<>?:"{}|~！#￥%……&*（）={}|《》？：“”【】、；‘’，。、\s+]/g)
        if (regex.test(value)) callback(new Error('不能输入特殊字符'))
        else callback()
      }
    },
    passCancel() {
      this.editPassData = {
        oldPass: '',
        newPass: ''
      }
    },
    passConfirm() {
      this.$refs.editPassForm.validate(async valid=>{
        if (valid) {
          this.loading = true
          let oldPassValid = false
          const username = localStorage.getItem('username')
          await User.queryOne(username).then(res => {
            if (res.code !== 0) this.$message.error(`修改失败:${res.message}`)
            else {
              if (res.data[0] && res.data[0].password !== this.editPassData.oldPass) this.$message.error('旧密码输入错误')
              else oldPassValid = true
            }
          }).catch(err => {
            this.$message.error(`修改失败:${err}`)
          })
          this.loading = false
          if (!oldPassValid) return
          this.loading = true
          await User.updatePass(username, this.editPassData.newPass).then(res => {
            if (res.code !== 0) this.$message.error(`修改失败:${res.message}`)
            else this.$message.success('修改成功')
          }).catch(err => {
            this.$message.error(`修改失败:${err}`)
          })
          this.loading = false
        }
      })
    },
    getLabels() {
      Label.getAll('update_time', 'desc').then(res => {
        if (res.code !== 0) this.$message.error(`获取标签失败:${res.msg}`)
        else {
          this.labels = res.data
        }
      }).catch(err => {
        console.log(err)
        this.$message.error(`获取标签失败:${err}`)
      })
    }
  }
}
</script>
  
<style lang='scss' scoped>
  .txt-btn{
    // color: var(--c_blue);
    color: rgb(6,86,171);
    height: 100%;
    border: 1px solid rgb(6,86,171);
    padding: 0px 10px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 16px;
    font-weight: 700; 
    display: flex;
    align-items: center;                           
    &:hover{
      // background-color: var(--c_gray);
      box-shadow:0 0 5px 2px var(--c_gray);
    }
    &-cancel{
        color: var(--c_gray_dark);
      border: 1px solid var(--c_gray_dark);
    }
    &-disable{
      pointer-events: none;
      color: var(--c_gray);
      border: 1px solid var(--c_gray);
    }
  }
  .show-eye {
    position: absolute;
    right: 7px;
    top: 7px;
    img {
      width: 28px;
      height: 28px;
      cursor: pointer;
    }
  }
  .pass-input {
    width: 300px;
    /deep/ .el-input__inner {
      padding-right: 38px;
    }
  }
  .icon-close {
    width: 10px;
    height: 10px;
    content: url('~@/assets/icons/dialog_close_active.svg');
    cursor: pointer;
  }
  .icon-delete {
    width: 24px;
    height: 24px;
    content: url('~@/assets/icons/icon-delete.svg');
    cursor: pointer;
  }
  .icon-edit {
    width: 24px;
    height: 24px;
    content: url('~@/assets/icons/icon-edit.svg');
    cursor: pointer;
    margin-right: 5px;
  }
  .icon-plus {
    width: 23px;
    height: 23px;
    content: url('~@/assets/icons/icon-plus-white.svg')
  }
</style>