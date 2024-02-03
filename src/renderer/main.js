import Vue from 'vue'
import axios from 'axios'

import App from './App'
import router from './router'
import store from './store'

import ElementUI from 'element-ui'
import 'element-ui/lib/theme-chalk/index.css'
Vue.use(ElementUI)

import Components from "./components/common"
Vue.use(Components)

import './styles/default.scss'
import 'video.js/dist/video-js.min.css'

if (!process.env.IS_WEB) Vue.use(require('vue-electron'))
Vue.http = Vue.prototype.$http = axios
Vue.config.productionTip = false

import { errLog } from './db/log.js'
// 全局vue异常捕获
Vue.config.warnHandler = function(msg, vm, trace) {
  // console.log(msg, vm, trace)
  errLog(msg, trace)
}

/* eslint-disable no-new */
new Vue({
  components: { App },
  router,
  store,
  template: '<App/>'
}).$mount('#app')
