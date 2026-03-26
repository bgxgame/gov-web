import { createRouter, createWebHistory } from 'vue-router'

// 1. 定义路由列表
const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/login/index.vue'),
    meta: { title: '登录', isPublic: true }
  },
  {
    path: '/',
    component: () => import('../layout/index.vue'), // 所有的业务页面都嵌套在 Layout 里
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('../views/dashboard/index.vue'),
        meta: { title: '首页', icon: 'HomeFilled' }
      },
      {
        path: 'project/manage',
        name: 'ProjectManage',
        component: () => import('../views/project/manage.vue'),
        meta: { title: '项目管理', icon: 'List' }
      },
      {
        path: 'project/engineering',
        name: 'EngineeringManage',
        component: () => import('../views/project/engineering.vue'),
        meta: { title: '工程管理', icon: 'Management' }
      },
      {
        path: 'system/user',
        name: 'UserManage',
        component: () => import('../views/system/user.vue'),
        meta: { title: '用户管理', icon: 'User' }
      },
      {
        path: 'system/dept',
        name: 'DeptManage',
        component: () => import('../views/system/dept.vue'),
        meta: { title: '部门管理', icon: 'OfficeBuilding' }
      },
      {
        path: 'system/role',
        name: 'RoleManage',
        component: () => import('../views/system/role.vue'),
        meta: { title: '角色管理', icon: 'Stamp' }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 2. 路由守卫：防止未登录越权访问
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  
  if (to.path === '/login') {
    next()
  } else {
    if (!token) {
      next('/login') // 无 Token 强制跳转登录
    } else {
      next() // 有 Token 放行
    }
  }
})

export default router