import { defineStore } from 'pinia'
import { getCurrentUser, login as loginApi, logout as logoutApi } from '../api/auth'

const USER_KEY = 'user_info'

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
  return [...new Set(menuKeys.map((item) => String(item || '').trim()).filter(Boolean))]
}

function parseUserInfo() {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    const data = JSON.parse(raw)
    return {
      ...data,
      roleCodes: normalizeRoleCodes(data?.roleCodes),
      menuKeys: normalizeMenuKeys(data?.menuKeys)
    }
  } catch (error) {
    return null
  }
}

export const useSessionStore = defineStore('session', {
  state: () => ({
    token: localStorage.getItem('token') || '',
    userInfo: parseUserInfo()
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.token)
  },
  actions: {
    setToken(token) {
      this.token = token || ''
      if (token) {
        localStorage.setItem('token', token)
      } else {
        localStorage.removeItem('token')
      }
    },
    setUserInfo(userInfo) {
      this.userInfo = userInfo || null
      if (userInfo) {
        localStorage.setItem(USER_KEY, JSON.stringify(userInfo))
      } else {
        localStorage.removeItem(USER_KEY)
      }
    },
    clearSession() {
      this.setToken('')
      this.setUserInfo(null)
    },
    async login(payload) {
      const res = await loginApi(payload)
      this.setToken(res.data.tokenValue)
      this.setUserInfo({
        userId: res.data.userId,
        username: res.data.username || payload.username,
        realName: res.data.realName,
        deptId: res.data.deptId,
        deptName: res.data.deptName,
        roleCodes: normalizeRoleCodes(res.data.roleCodes),
        menuKeys: normalizeMenuKeys(res.data.menuKeys)
      })
      return res
    },
    async refreshUserInfo() {
      if (!this.token) return
      const res = await getCurrentUser()
      this.setUserInfo({
        userId: res.data.userId,
        username: res.data.username,
        realName: res.data.realName,
        deptId: res.data.deptId,
        deptName: res.data.deptName,
        roleCodes: normalizeRoleCodes(res.data.roleCodes),
        menuKeys: normalizeMenuKeys(res.data.menuKeys)
      })
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
      return menus.includes(menuKey)
    },
    hasAnyMenu(menuKeys) {
      const menus = this.userInfo?.menuKeys || []
      return (menuKeys || []).some((key) => menus.includes(key))
    },
    async logout(callServer = true) {
      if (callServer) {
        try {
          await logoutApi()
        } catch (error) {
          // 忽略登出接口异常，仍继续清理本地会话
        }
      }
      this.clearSession()
    }
  }
})
