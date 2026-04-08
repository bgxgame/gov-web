import { defineStore } from 'pinia'
import { getCurrentUser, login as loginApi, logout as logoutApi } from '../api/auth'
import { filterEnabledMenuKeys, isMenuEnabled } from '../utils/menu-feature'
import { clearAuthStorage, hasAuthSessionHint, readUserInfoCache, writeUserInfoCache } from '../utils/browser-storage'

export const MENU_ROUTE_PRIORITY = [
  { menu: 'dashboard:view', path: '/dashboard' },
  { menu: 'project:manage', path: '/project/manage' },
  { menu: 'project:engineering', path: '/project/engineering' },
  { menu: 'system:user', path: '/system/user' },
  { menu: 'system:dept', path: '/system/dept' },
  { menu: 'system:role', path: '/system/role' },
  { menu: 'system:audit', path: '/system/audit' },
  { menu: 'system:frontend-monitor', path: '/system/frontend-monitor' }
]

export function resolveHomePathByMenuKeys(menuKeys) {
  const normalizedMenus = filterEnabledMenuKeys(menuKeys)
  return MENU_ROUTE_PRIORITY.find((item) => normalizedMenus.includes(item.menu))?.path || null
}

export function resolveFirstEnabledMenuPath() {
  return MENU_ROUTE_PRIORITY.find((item) => isMenuEnabled(item.menu))?.path || null
}

export function resolveHomePathFromCachedUserInfo() {
  const parsed = readUserInfoCache()
  return parsed ? resolveHomePathByMenuKeys(parsed?.menuKeys) : null
}

function normalizeRoleCode(roleCode) {
  const raw = String(roleCode || '').trim().toLowerCase()
  if (!raw) return null
  if (['admin', 'administrator', 'super_admin', 'superadmin', 'role_admin'].includes(raw)) return 'admin'
  if (['dept_leader', 'deptleader', 'department_leader', 'leader', 'role_dept_leader'].includes(raw)) {
    return 'dept_leader'
  }
  if (['user', 'normal_user', 'role_user'].includes(raw)) return 'user'
  return raw
}

function normalizeRoleCodes(roleCodes) {
  if (!Array.isArray(roleCodes)) return []
  const normalized = roleCodes.map((item) => normalizeRoleCode(item)).filter(Boolean)
  if (!normalized.includes('user')) normalized.push('user')
  return [...new Set(normalized)]
}

function normalizeMenuKeys(menuKeys) {
  if (!Array.isArray(menuKeys)) return []
  return filterEnabledMenuKeys(menuKeys.map((item) => String(item || '').trim()).filter(Boolean))
}

function parseUserInfo() {
  const data = readUserInfoCache()
  if (!data) return null
  return {
    ...data,
    roleCodes: normalizeRoleCodes(data?.roleCodes),
    menuKeys: normalizeMenuKeys(data?.menuKeys)
  }
}

function normalizeUserInfo(data, fallbackUsername) {
  return {
    userId: data?.userId,
    username: data?.username || fallbackUsername,
    realName: data?.realName,
    deptId: data?.deptId,
    deptName: data?.deptName,
    roleCodes: normalizeRoleCodes(data?.roleCodes),
    menuKeys: normalizeMenuKeys(data?.menuKeys)
  }
}

function hasAnyUserInfoPayload(data) {
  return Boolean(
    data &&
    (
      data.userId !== undefined ||
      String(data.username || '').trim() ||
      String(data.realName || '').trim() ||
      Array.isArray(data.roleCodes) ||
      Array.isArray(data.menuKeys)
    )
  )
}

function hasCompleteUserInfoPayload(data) {
  return Array.isArray(data?.roleCodes) && Array.isArray(data?.menuKeys)
}

export const useSessionStore = defineStore('session', {
  state: () => {
    const cachedUserInfo = parseUserInfo()
    return {
      authenticatedHint: hasAuthSessionHint(),
      userInfo: cachedUserInfo,
      userInfoSource: cachedUserInfo ? 'cache' : '',
      _userInfoPromise: null,
      _lastEnsureServerAt: 0
    }
  },
  getters: {
    isAuthenticated: (state) => Boolean(state.authenticatedHint || state.userInfo),
    homePath: (state) => resolveHomePathByMenuKeys(state.userInfo?.menuKeys || [])
  },
  actions: {
    syncAuthenticatedHint() {
      this.authenticatedHint = hasAuthSessionHint() || Boolean(this.userInfo)
    },

    setUserInfo(userInfo, source = 'manual') {
      this.userInfo = userInfo || null
      this.userInfoSource = userInfo ? source : ''
      if (userInfo && (source === 'server' || source === 'login')) {
        this._lastEnsureServerAt = Date.now()
      }
      writeUserInfoCache(userInfo)
      this.syncAuthenticatedHint()
    },

    clearSession() {
      this._userInfoPromise = null
      this._lastEnsureServerAt = 0
      this.userInfo = null
      this.userInfoSource = ''
      clearAuthStorage()
      this.authenticatedHint = false
    },

    async login(payload) {
      const res = await loginApi(payload)
      this.syncAuthenticatedHint()

      if (hasAnyUserInfoPayload(res?.data)) {
        this.setUserInfo(normalizeUserInfo(res.data, payload.username), 'login')
      } else {
        this.userInfoSource = ''
      }

      if (!hasCompleteUserInfoPayload(res?.data)) {
        try {
          await this.refreshUserInfo()
        } catch (error) {
          // Keep the successful login flow and let the next guarded request retry.
        }
      }

      return res
    },

    async refreshUserInfo() {
      this.syncAuthenticatedHint()
      if (!this.isAuthenticated) return null
      const res = await getCurrentUser()
      const userInfo = normalizeUserInfo(res.data, this.userInfo?.username)
      this.setUserInfo(userInfo, 'server')
      this.authenticatedHint = true
      this._lastEnsureServerAt = Date.now()
      return userInfo
    },

    async ensureUserInfo(forceRefresh = false, options = {}) {
      this.syncAuthenticatedHint()
      if (!this.isAuthenticated) return null

      const minForceRefreshIntervalMs = Number(options?.minForceRefreshIntervalMs || 0)
      const hasUserInfoReady =
        !forceRefresh &&
        this.userInfo &&
        Array.isArray(this.userInfo.roleCodes) &&
        Array.isArray(this.userInfo.menuKeys)

      if (hasUserInfoReady) {
        return this.userInfo
      }

      const hasRecentServerSync =
        forceRefresh &&
        minForceRefreshIntervalMs > 0 &&
        this._lastEnsureServerAt > 0 &&
        Date.now() - this._lastEnsureServerAt < minForceRefreshIntervalMs &&
        this.userInfo &&
        Array.isArray(this.userInfo.roleCodes) &&
        Array.isArray(this.userInfo.menuKeys)

      if (hasRecentServerSync) {
        return this.userInfo
      }

      if (!this._userInfoPromise) {
        this._userInfoPromise = getCurrentUser()
          .then((res) => {
            const userInfo = normalizeUserInfo(res.data, this.userInfo?.username)
            this.setUserInfo(userInfo, 'server')
            this.authenticatedHint = true
            this._lastEnsureServerAt = Date.now()
            return userInfo
          })
          .finally(() => {
            this._userInfoPromise = null
          })
      }

      return this._userInfoPromise
    },

    hasRole(roleCode) {
      const roles = this.userInfo?.roleCodes || []
      if (roles.length === 0 && roleCode === 'user') {
        return true
      }
      return roles.includes(roleCode)
    },

    hasAnyRole(roleCodes) {
      const current = this.userInfo?.roleCodes || []
      if (current.length === 0) {
        return (roleCodes || []).includes('user')
      }
      return (roleCodes || []).some((item) => current.includes(item))
    },

    hasMenu(menuKey) {
      const menus = this.userInfo?.menuKeys || []
      return isMenuEnabled(menuKey) && menus.includes(menuKey)
    },

    hasAnyMenu(menuKeys) {
      const menus = this.userInfo?.menuKeys || []
      const enabledMenuKeys = filterEnabledMenuKeys(menuKeys)
      if (enabledMenuKeys.length === 0) return false
      return enabledMenuKeys.some((key) => menus.includes(key))
    },

    async logout(callServer = true) {
      if (callServer) {
        try {
          await logoutApi()
        } catch (error) {
          // Always clear local state even if the backend logout request fails.
        }
      }
      this.clearSession()
    }
  }
})
