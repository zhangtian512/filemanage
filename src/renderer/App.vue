<template>
  <div id="app">
    <router-view></router-view>
  </div>
</template>

<script>
import { initMinio } from '@/db/minio.js'
import { initPg } from '@/db/pg.js'
import { initDir } from '@/func/index.js'

export default {
  name: 'file-manage',
  created () {
    // 初始化主题
    var link = document.createElement('link')
    link.setAttribute('rel','stylesheet')
    link.setAttribute('id','theme_style')
    link.setAttribute('href','static/theme/light.css')
    document.body.append(link)

    // 初始化数据库
    initMinio()
    initPg()
    initDir()

  },
}
</script>

<style>
  /* CSS */
  html {
    height: 100%;
  }
  body {
    height: 100%;
    margin: 0px;
    font-family: Microsoft JhengHei;
    -webkit-app-region: drag;
    /* -webkit-user-select: none; */
  }
  input, textarea, select, button {
    font-family: Microsoft JhengHei;
  }
  #app {
    height: 100%;
    width: 100%;
    overflow: hidden;
  }
</style>
