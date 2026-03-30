import { createRouter, createWebHistory } from 'vue-router'
import { resolveHomePathFromCachedUserInfo, useSessionStore } from '../stores/session'
import { appConfig } from '../config/app-config'
import { showError } from '../utils/feedback'
import { logUserAction, logger } from '../utils/logger'
import { nowMs, reportPerfAction } from '../utils/perf-metrics'
import { finishRouteProgress, startRouteProgress } from '../utils/route-progress'

/**
 * 职责：维护前端静态路由表，并通过 `meta` 描述菜单权限、角色权限和缓存策略。
 * 为什么存在：当前菜单规模稳定，静态路由能降低动态注入复杂度，同时保持权限判断可读。
 * 关键输入输出：输入为浏览器地址和当前登录用户权限；输出为目标页面组件与访问控制结果。
 * 关联链路：登录成功 -> 路由守卫 -> 主布局 -> 菜单切换。
 */
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
    redirect: () => resolveProtectedEntryPath(),
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('../views/dashboard/index.vue'),
        meta: { title: '首页', icon: 'HomeFilled', menus: ['dashboard:view'], keepAlive: true }
      },
      {
        path: 'project/manage',
        name: 'ProjectManage',
        component: () => import('../views/project/manage.vue'),
        meta: {
          title: '项目管理',
          icon: 'List',
          roles: ['admin', 'dept_leader', 'user'],
          menus: ['project:manage'],
          keepAlive: true
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
          menus: ['project:engineering'],
          keepAlive: true
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
          menus: ['system:user'],
          keepAlive: true
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
          menus: ['system:dept'],
          keepAlive: true
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
          menus: ['system:role'],
          keepAlive: true
        }
      },
      {
        path: 'system/audit',
        name: 'AuditManage',
        component: () => import('../views/system/audit.vue'),
        meta: {
          title: '审计日志',
          icon: 'DataAnalysis',
          roles: ['admin'],
          menus: ['system:audit'],
          keepAlive: true
        }
      },
      {
        path: 'system/frontend-monitor',
        name: 'FrontendMonitorManage',
        component: () => import('../views/system/frontend-monitor.vue'),
        meta: {
          title: '前端监控',
          icon: 'Monitor',
          roles: ['admin'],
          menus: ['system:frontend-monitor'],
          keepAlive: true
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
let currentRouteGuardMetrics = null

function resolveHomePath(sessionStore) {
  return sessionStore.homePath && sessionStore.homePath !== '/login' ? sessionStore.homePath : '/dashboard'
}

function resolveProtectedEntryPath() {
  if (typeof window === 'undefined') return '/dashboard'
  const token = localStorage.getItem('token')
  if (!token) return '/login'
  return resolveHomePathFromCachedUserInfo() || '/dashboard'
}

function resolveDeniedNavigationTarget(to, from, sessionStore) {
  if (from?.path && from.path !== to.path) {
    return false
  }
  const homePath = sessionStore.homePath
  return homePath && homePath !== to.path ? homePath : false
}

function shouldReuseCachedUserInfo(sessionStore, to) {
  if (!sessionStore.userInfo || sessionStore.userInfoSource !== 'cache') return false
  const requiredMenus = to.meta?.menus || []
  if (requiredMenus.length > 0) {
    return sessionStore.hasAnyMenu(requiredMenus)
  }
  const requiredRoles = to.meta?.roles || []
  if (requiredRoles.length > 0) {
    return sessionStore.hasAnyRole(requiredRoles)
  }
  return true
}

/**
 * 职责：统一处理登录校验、用户信息补齐和菜单/角色权限判断。
 * 为什么存在：让每次路由切换都走同一套会话与权限逻辑，避免页面层自行兜底。
 * 关键输入输出：输入为目标路由、当前会话和用户权限；输出为放行、阻止或重定向决策。
 * 关联链路：登录跳转、菜单切换、刷新页面后的权限恢复。
 */
router.beforeEach(async (to, from, next) => {
  const guardStartAt = nowMs()
  currentRouteProgressToken = startRouteProgress({
    fromPath: from.path,
    toPath: to.path,
    redirectedFromPath: to.redirectedFrom?.fullPath || ''
  })
  const guardMetrics = {
    token: currentRouteProgressToken,
    startedAt: guardStartAt,
    fromPath: from.path,
    toPath: to.path,
    redirectedFromPath: to.redirectedFrom?.fullPath || '',
    ensureUserInfoMs: 0,
    forceRefreshPermissionMs: 0,
    decision: 'allow'
  }
  currentRouteGuardMetrics = guardMetrics
  const sessionStore = useSessionStore()
  const isPublic = Boolean(to.meta?.isPublic)
  logUserAction('route_before_each', {
    fromPath: from.path,
    toPath: to.path,
    isPublic,
    isAuthenticated: sessionStore.isAuthenticated
  }, 'debug')

  if (isPublic) {
    if (to.path === '/login' && sessionStore.isAuthenticated) {
      const homePath = resolveHomePath(sessionStore)
      guardMetrics.decision = 'redirect_login_to_home'
      logger.info('已登录用户访问登录页，自动跳转首页', {
        fromPath: from.path,
        toPath: to.path,
        homePath
      })
      next(homePath)
      return
    }
    next()
    return
  }

  if (!sessionStore.isAuthenticated) {
    guardMetrics.decision = 'redirect_to_login'
    logger.warn('未登录访问受保护页面，已跳转登录页', {
      fromPath: from.path,
      toPath: to.path
    })
    next('/login')
    return
  }

  try {
    if (!shouldReuseCachedUserInfo(sessionStore, to)) {
      const ensureStartAt = nowMs()
      await sessionStore.ensureUserInfo()
      guardMetrics.ensureUserInfoMs = Math.round(nowMs() - ensureStartAt)
    }
  } catch (error) {
    guardMetrics.decision = 'logout_and_redirect_login'
    logger.error('补拉当前用户信息失败，已清理会话', {
      fromPath: from.path,
      toPath: to.path,
      message: error?.message
    })
    await sessionStore.logout(false)
    next('/login')
    return
  }

  const requiredMenus = to.meta?.menus || []
  if (requiredMenus.length > 0 && !sessionStore.hasAnyMenu(requiredMenus)) {
    if (sessionStore.userInfoSource === 'cache') {
      try {
        const refreshStartAt = nowMs()
        await sessionStore.ensureUserInfo(true, { minForceRefreshIntervalMs: 45000 })
        guardMetrics.forceRefreshPermissionMs = Math.round(nowMs() - refreshStartAt)
      } catch (error) {
        guardMetrics.decision = 'force_refresh_failed_redirect_login'
        logger.error('强制刷新用户权限失败，已清理会话', {
          fromPath: from.path,
          toPath: to.path,
          message: error?.message
        })
        await sessionStore.logout(false)
        next('/login')
        return
      }
    }

    if (!sessionStore.hasAnyMenu(requiredMenus)) {
      guardMetrics.decision = 'redirect_permission_denied'
      logger.warn('用户访问了无权限页面，已阻止跳转', {
        fromPath: from.path,
        toPath: to.path,
        requiredMenus,
        homePath: sessionStore.homePath
      })
      showError('当前账号暂无权限访问该页面')
      next(resolveDeniedNavigationTarget(to, from, sessionStore))
      return
    }
  }

  const requiredRoles = to.meta?.roles || []
  const hasMenuGate = requiredMenus.length > 0
  if (!hasMenuGate && requiredRoles.length > 0 && !sessionStore.hasAnyRole(requiredRoles)) {
    const homePath = sessionStore.homePath
    if (!homePath) {
      guardMetrics.decision = 'role_denied_logout'
      logger.warn('用户角色不满足页面要求且没有可用首页，已回到登录页', {
        fromPath: from.path,
        toPath: to.path,
        requiredRoles
      })
      await sessionStore.logout(false)
      next('/login')
      return
    }
    guardMetrics.decision = 'role_denied_redirect_home'
    logger.warn('用户角色不满足页面要求，已跳回可访问首页', {
      fromPath: from.path,
      toPath: to.path,
      requiredRoles,
      homePath
    })
    next(resolveDeniedNavigationTarget(to, from, sessionStore))
    return
  }

  guardMetrics.guardDurationMs = Math.round(nowMs() - guardStartAt)
  next()
})

router.afterEach((to, from, failure) => {
  const routeMetrics = finishRouteProgress(currentRouteProgressToken)
  const guardMetrics = currentRouteGuardMetrics && currentRouteGuardMetrics.token === currentRouteProgressToken
    ? currentRouteGuardMetrics
    : null
  if (guardMetrics) {
    if (!guardMetrics.guardDurationMs) {
      guardMetrics.guardDurationMs = Math.round(nowMs() - guardMetrics.startedAt)
    }
    const routePerfPayload = {
      fromPath: guardMetrics.fromPath,
      toPath: guardMetrics.toPath,
      redirectedFromPath: guardMetrics.redirectedFromPath,
      decision: guardMetrics.decision,
      ensureUserInfoMs: guardMetrics.ensureUserInfoMs,
      forceRefreshPermissionMs: guardMetrics.forceRefreshPermissionMs,
      guardDurationMs: guardMetrics.guardDurationMs,
      routeDurationMs: routeMetrics?.durationMs,
      routeThresholdMs: routeMetrics?.thresholdMs,
      hasSlowGuard: guardMetrics.guardDurationMs >= appConfig.slowRouteThreshold,
      hasSlowRoute: routeMetrics ? routeMetrics.durationMs >= routeMetrics.thresholdMs : false,
      failure: Boolean(failure)
    }
    reportPerfAction('route_navigation_settled', {
      ...routePerfPayload,
      durationMs: Number(routePerfPayload.routeDurationMs || routePerfPayload.guardDurationMs || 0)
    }, {
      thresholdMs: Number(routePerfPayload.routeThresholdMs || appConfig.slowRouteThreshold),
      normalLevel: 'info'
    })
    if (routePerfPayload.hasSlowGuard || routePerfPayload.hasSlowRoute) {
      logger.warn('路由性能剖析', routePerfPayload)
    } else {
      logger.debug('路由性能剖析', routePerfPayload)
    }
  }

  if (failure) {
    logger.warn('路由切换完成但存在导航失败', {
      fromPath: from.path,
      toPath: to.path,
      message: failure?.message
    })
  } else {
    logUserAction('route_after_each', {
      fromPath: from.path,
      toPath: to.path
    }, 'debug')
  }
  currentRouteGuardMetrics = null
})

router.onError((error) => {
  const routeMetrics = finishRouteProgress(currentRouteProgressToken, { hasError: true })
  if (routeMetrics) {
    logger.warn('路由性能剖析', {
      fromPath: routeMetrics.fromPath,
      toPath: routeMetrics.toPath,
      redirectedFromPath: routeMetrics.redirectedFromPath,
      routeDurationMs: routeMetrics.durationMs,
      routeThresholdMs: routeMetrics.thresholdMs,
      hasError: true
    })
  }
  currentRouteGuardMetrics = null
  logger.error('路由加载失败', { message: error?.message })
  showError('页面加载失败，请稍后重试')
})

export default router
