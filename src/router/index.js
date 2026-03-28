import { createRouter, createWebHistory } from 'vue-router'
import { useSessionStore } from '../stores/session'

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
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

const menuRoutePriority = [
  { menu: 'dashboard:view', path: '/dashboard' },
  { menu: 'project:manage', path: '/project/manage' },
  { menu: 'project:engineering', path: '/project/engineering' },
  { menu: 'system:user', path: '/system/user' },
  { menu: 'system:dept', path: '/system/dept' },
  { menu: 'system:role', path: '/system/role' }
]

function resolveHomePath(sessionStore) {
  const target = menuRoutePriority.find((item) => sessionStore.hasMenu(item.menu))
  return target?.path || null
}

router.beforeEach(async (to, from, next) => {
  const sessionStore = useSessionStore()
  const isPublic = Boolean(to.meta?.isPublic)

  if (isPublic) {
    if (to.path === '/login' && sessionStore.isAuthenticated) {
      const homePath = resolveHomePath(sessionStore)
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

  const needRefreshUserInfo =
    !sessionStore.userInfo ||
    !Array.isArray(sessionStore.userInfo.roleCodes) ||
    !Array.isArray(sessionStore.userInfo.menuKeys)
  if (needRefreshUserInfo) {
    try {
      await sessionStore.refreshUserInfo()
    } catch (error) {
      next('/login')
      return
    }
  }

  const requiredMenus = to.meta?.menus || []
  if (requiredMenus.length > 0 && !sessionStore.hasAnyMenu(requiredMenus)) {
    const homePath = resolveHomePath(sessionStore)
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

  const requiredRoles = to.meta?.roles || []
  const hasMenuGate = requiredMenus.length > 0
  if (!hasMenuGate && requiredRoles.length > 0 && !sessionStore.hasAnyRole(requiredRoles)) {
    const homePath = resolveHomePath(sessionStore)
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

export default router
