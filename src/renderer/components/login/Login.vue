<template>
  <div class="login-wrapper" v-loading="loading">
    <div class="logo"></div>
    <div class="close" style="cursor:pointer;-webkit-app-region:no-drag;" @click="close"></div>
    <div style="font-size:22px;font-weight:700;margin:22px 0px;">文件管理系统</div>
    <div style="display:flex;flex-direction:column;align-items:center;width:100%;-webkit-app-region: no-drag;">
      <el-input v-model.trim="username" placeholder="账户名" style="width:245px;margin-bottom:10px;"/>
      <el-input v-model.trim="password" type="password" placeholder="密码" style="width:245px;margin-bottom:20px;"/>
      <div class="btn" :class="canLogin?'':'disable'" @click="login">登录</div>
    </div>
    
  </div>
</template>
  
<script>
import { remote } from 'electron'
import { User } from '@/db/pg.js'
export default {
  name: '',
  components: {},
  props: {},
  data () {
    return {
      loading: false,
      username: 'admin',
      password: 'admin123'
    }
  },
  mounted () {},
  created () {
    this.resizeWindow()
  },
  watch: {},
  computed: {
    canLogin() {
      if (!this.username || !this.password) return false
      return true
    }
  },
  methods: {
    resizeWindow() {
      const win = remote.getCurrentWindow()
      win.setResizable(false)
      win.setSize(340,300)
      win.center()
    },
    close() {
      remote.getCurrentWindow().destroy()
    },
    login() {
      this.loading = true
      User.login(this.username,this.password).then(res => {
        console.log(res)
        if (res.code !== 0) {
          let content = '登录失败'
          if (res.code === 1) content += ':用户名或密码错误'
          if (res.code === 2) content += ':数据库连接失败'
          this.$message({
            type: 'error',
            message: content,
            center: true
          })
        } else {
          localStorage.setItem('username', this.username)
          this.$router.push({name:'home'})
        }
      }).finally(() => {this.loading=false})
    }
  }
}
</script>
  
<style lang='scss' scoped>
.login-wrapper {
  box-sizing: border-box;
  padding: 15px;
  text-align: center;
  .logo {
    width: 25px;
    height: 25px;
    content: url('~@/assets/logo.svg')
  }
  .close {
    position: absolute;
    right: 10px;
    top: 10px;
    width: 16px;
    height: 16px;
    content: url('~@/assets/icons/dialog_close_hover.svg')
  }
  .btn {
    text-align: center;
    width: 245px;
    height: 40px;
    line-height: 40px;
    border-radius: 4px;
    color: #fff;
    cursor: pointer;
    background-color: #1296DB;
  }
  .disable {
    background-color: rgba(18,150,219,0.2);
    cursor: default;
    pointer-events: none;
  }
}
</style>
<style lang='scss'>
.el-message {
  min-width: 200px;
}
</style>