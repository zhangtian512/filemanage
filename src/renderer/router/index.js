import Vue from 'vue'
import Router from 'vue-router'

Vue.use(Router)

const router = new Router({
  routes: [
    {
      path: '/',
      component: {
        template: '<router-view></router-view>'
      },
      redirect: {name: 'login'},
      children: [
        {
          path: 'login',
          name: 'login',
          component: () => import ('@/components/login/Login')
        },
        {
          path: 'home',
          name: 'home',
          component: () => import ('@/components/index'),
          redirect: {name: 'filelist'},
          children: [
            {
              path: 'filelist',
              name: 'filelist',
              component: () => import ('@/components/fileList/FileList')
            },
            {
              path: 'transfer',
              name: 'transfer',
              component: () => import ('@/components/transfer/Transfer')
            },
            {
              path: 'syssetting',
              name: 'syssetting',
              component: () => import ('@/components/syssetting/SysSetting')
            }
          ]
        },
      ]
    }
  ]
})

router.beforeEach((to, from, next) => {
  routeInterupter(to, from, next, router)
})

export async function routeInterupter (to, from, next, router) {
  // console.log('to:', to.path)
  // console.log('from:', from.path)
  next()
}

export default router
