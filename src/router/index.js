import { createRouter, createWebHistory } from 'vue-router'
import { useSessionStore } from '../stores/session'

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
        meta: { title: '项目管理', icon: 'List', roles: ['admin', 'dept_leader', 'user'] }
      },
      {
        path: 'project/engineering',
        name: 'EngineeringManage',
        component: () => import('../views/project/engineering.vue'),
        meta: { title: '工程管理', icon: 'Management', roles: ['admin', 'dept_leader'] }
      },
      {
        path: 'system/user',
        name: 'UserManage',
        component: () => import('../views/system/user.vue'),
        meta: { title: '用户管理', icon: 'User', roles: ['admin', 'dept_leader'] }
      },
      {
        path: 'system/dept',
        name: 'DeptManage',
        component: () => import('../views/system/dept.vue'),
        meta: { title: '部门管理', icon: 'OfficeBuilding', roles: ['admin', 'dept_leader'] }
      },
      {
        path: 'system/role',
        name: 'RoleManage',
        component: () => import('../views/system/role.vue'),
        meta: { title: '角色管理', icon: 'Stamp', roles: ['admin'] }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 2. 路由守卫：防止未登录越权访问
router.beforeEach(async (to, from, next) => {
  const sessionStore = useSessionStore()
  const isPublic = Boolean(to.meta?.isPublic)

  if (isPublic) {
    if (to.path === '/login' && sessionStore.isAuthenticated) {
      next('/dashboard')
      return
    }
    next()
    return
  }

  if (!sessionStore.isAuthenticated) {
    next('/login')
    return
  }

  const needRefreshUserInfo = !sessionStore.userInfo || !Array.isArray(sessionStore.userInfo.roleCodes)
  if (needRefreshUserInfo) {
    try {
      await sessionStore.refreshUserInfo()
    } catch (error) {
      next('/login')
      return
    }
  }

  const requiredRoles = to.meta?.roles || []
  if (requiredRoles.length > 0 && !sessionStore.hasAnyRole(requiredRoles)) {
    next('/dashboard')
    return
  }

  next()
})

export default router
