import { createRouter, createWebHistory } from 'vue-router'
import { useSessionStore } from '../stores/session'
import { showError } from '../utils/feedback'
import { logger } from '../utils/logger'
import { finishRouteProgress, startRouteProgress } from '../utils/route-progress'
import AuditManageView from '../views/system/audit.vue'

// 静态路由表：当前菜单规模可控，配合 meta.menus 即可满足权限需求。
const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/login/index.vue'),
    meta: { title: '登录', isPublic: true }
  },
  {
    path: '/',
    component: () => import('../layout/index.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('../views/dashboard/index.vue'),
        meta: { title: '首页', icon: 'HomeFilled', menus: ['dashboard:view'] }
      },
      {
        path: 'project/manage',
        name: 'ProjectManage',
        component: () => import('../views/project/manage.vue'),
        meta: {
          title: '项目管理',
          icon: 'List',
          roles: ['admin', 'dept_leader', 'user'],
          menus: ['project:manage']
        }
      },
      {
        path: 'project/engineering',
        name: 'EngineeringManage',
        component: () => import('../views/project/engineering.vue'),
        meta: {
          title: '工程进度',
          icon: 'Management',
          roles: ['admin', 'dept_leader'],
          menus: ['project:engineering']
        }
      },
      {
        path: 'system/user',
        name: 'UserManage',
        component: () => import('../views/system/user.vue'),
        meta: {
          title: '用户管理',
          icon: 'User',
          roles: ['admin', 'dept_leader'],
          menus: ['system:user']
        }
      },
      {
        path: 'system/dept',
        name: 'DeptManage',
        component: () => import('../views/system/dept.vue'),
        meta: {
          title: '部门管理',
          icon: 'OfficeBuilding',
          roles: ['admin', 'dept_leader'],
          menus: ['system:dept']
        }
      },
      {
        path: 'system/role',
        name: 'RoleManage',
        component: () => import('../views/system/role.vue'),
        meta: {
          title: '角色管理',
          icon: 'Stamp',
          roles: ['admin'],
          menus: ['system:role']
        }
      },
      {
        path: 'system/audit',
        name: 'AuditManage',
        component: AuditManageView,
        meta: {
          title: '审计日志',
          icon: 'DataAnalysis',
          roles: ['admin'],
          menus: ['system:audit']
        }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

let currentRouteProgressToken = 0

/**
 * 全局前置守卫：
 * 1. 登录校验
 * 2. 用户信息补拉
 * 3. 菜单权限与角色权限判断
 */
router.beforeEach(async (to, from, next) => {
  currentRouteProgressToken = startRouteProgress()
  const sessionStore = useSessionStore()
  const isPublic = Boolean(to.meta?.isPublic)

  if (isPublic) {
    if (to.path === '/login' && sessionStore.isAuthenticated) {
      const homePath = sessionStore.homePath
      if (homePath && homePath !== '/login') {
        next(homePath)
      } else {
        next()
      }
      return
    }
    next()
    return
  }

  if (!sessionStore.isAuthenticated) {
    next('/login')
    return
  }

  try {
    await sessionStore.ensureUserInfo()
  } catch (error) {
    next('/login')
    return
  }

  const requiredMenus = to.meta?.menus || []
  if (requiredMenus.length > 0 && !sessionStore.hasAnyMenu(requiredMenus)) {
    // 权限不足时做一次强制刷新，若仍无权限则停留在当前页并给出提示，避免反复跳回首页。
    try {
      await sessionStore.ensureUserInfo(true)
    } catch (error) {
      next('/login')
      return
    }
    if (!sessionStore.hasAnyMenu(requiredMenus)) {
      showError('当前账号暂无权限访问该页面')
      const homePath = sessionStore.homePath
      if (homePath && homePath !== to.path) {
        next(homePath)
      } else {
        next(false)
      }
      return
    }
    next()
    return
  }

  const requiredRoles = to.meta?.roles || []
  const hasMenuGate = requiredMenus.length > 0
  if (!hasMenuGate && requiredRoles.length > 0 && !sessionStore.hasAnyRole(requiredRoles)) {
    const homePath = sessionStore.homePath
    if (!homePath) {
      await sessionStore.logout(false)
      next('/login')
      return
    }
    if (homePath === to.path) {
      next(false)
      return
    }
    next(homePath)
    return
  }

  next()
})

router.afterEach(() => {
  finishRouteProgress(currentRouteProgressToken)
})

router.onError((error) => {
  finishRouteProgress(currentRouteProgressToken, { hasError: true })
  logger.error('路由加载失败', { message: error?.message })
  showError('页面加载失败，请稍后重试')
})

export default router
