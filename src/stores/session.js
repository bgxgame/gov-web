import { defineStore } from 'pinia'
import { getCurrentUser, login as loginApi, logout as logoutApi } from '../api/auth'

const USER_KEY = 'user_info'

/**
 * 职责：
 * 维护登录态、当前用户信息、角色码、菜单权限和默认首页。
 *
 * 为什么存在：
 * 把“认证态”和“权限态”统一收在一个 store 中，避免页面和路由重复处理会话细节。
 *
 * 关键输入输出：
 * 输入来自登录接口、`/system/me` 和本地存储；
 * 输出给路由守卫、布局菜单和页面按钮权限判断。
 *
 * 关联链路：
 * 登录 -> 初始化用户信息 -> 计算默认首页 -> 路由权限判断。
 */
const MENU_ROUTE_PRIORITY = [
  { menu: 'dashboard:view', path: '/dashboard' },
  { menu: 'project:manage', path: '/project/manage' },
  { menu: 'project:engineering', path: '/project/engineering' },
  { menu: 'system:user', path: '/system/user' },
  { menu: 'system:dept', path: '/system/dept' },
  { menu: 'system:role', path: '/system/role' }
]

/**
 * 作用：
 * 把后端或历史数据里可能存在的多种角色编码写法统一成标准值。
 *
 * 为什么这样做：
 * 这样前端判断角色时只需要认识 `admin / dept_leader / user` 这一套编码。
 */
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

/**
 * 作用：
 * 标准化角色数组，并确保始终包含基础 `user` 角色。
 *
 * 输出：
 * 去重后的标准角色码数组。
 */
function normalizeRoleCodes(roleCodes) {
  if (!Array.isArray(roleCodes)) return []
  const normalized = roleCodes.map((item) => normalizeRoleCode(item)).filter(Boolean)
  if (!normalized.includes('user')) normalized.push('user')
  return [...new Set(normalized)]
}

/**
 * 作用：
 * 标准化菜单权限数组，去空值并去重。
 */
function normalizeMenuKeys(menuKeys) {
  if (!Array.isArray(menuKeys)) return []
  return [...new Set(menuKeys.map((item) => String(item || '').trim()).filter(Boolean))]
}

/**
 * 作用：
 * 从本地存储恢复用户信息，并顺手完成角色/菜单标准化。
 *
 * 输出：
 * 标准化后的用户信息对象，或 `null`。
 */
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

/**
 * 作用：
 * 规范化后端返回的当前用户载荷，作为 store 内部统一结构。
 *
 * 输入：
 * 登录或 `/me` 接口返回的数据。
 *
 * 输出：
 * 带标准角色码和菜单键的用户对象。
 */
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

export const useSessionStore = defineStore('session', {
  state: () => ({
    token: localStorage.getItem('token') || '',
    userInfo: parseUserInfo()
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.token),
    homePath: (state) => {
      const menuKeys = state.userInfo?.menuKeys || []
      return MENU_ROUTE_PRIORITY.find((item) => menuKeys.includes(item.menu))?.path || null
    }
  },
  actions: {
    /**
     * 作用：
     * 设置并持久化 token。
     */
    setToken(token) {
      this.token = token || ''
      if (token) {
        localStorage.setItem('token', token)
      } else {
        localStorage.removeItem('token')
      }
    },

    /**
     * 作用：
     * 设置并持久化当前用户信息。
     */
    setUserInfo(userInfo) {
      this.userInfo = userInfo || null
      if (userInfo) {
        localStorage.setItem(USER_KEY, JSON.stringify(userInfo))
      } else {
        localStorage.removeItem(USER_KEY)
      }
    },

    /**
     * 作用：
     * 清理本地会话信息。
     */
    clearSession() {
      this.setToken('')
      this.setUserInfo(null)
    },

    /**
     * 作用：
     * 执行登录并同步初始化会话。
     *
     * 关联链路：
     * 登录页 -> store.login -> 路由跳转到默认首页。
     */
    async login(payload) {
      const res = await loginApi(payload)
      this.setToken(res.data.tokenValue)
      this.setUserInfo(normalizeUserInfo(res.data, payload.username))
      return res
    },

    /**
     * 作用：
     * 在已有 token 的前提下刷新当前用户信息。
     */
    async refreshUserInfo() {
      if (!this.token) return
      const res = await getCurrentUser()
      this.setUserInfo(normalizeUserInfo(res.data))
    },

    /**
     * 作用：
     * 判断当前用户是否拥有指定角色。
     */
    hasRole(roleCode) {
      const roles = this.userInfo?.roleCodes || []
      if (roles.length === 0 && roleCode === 'user') {
        return true
      }
      return roles.includes(roleCode)
    },

    /**
     * 作用：
     * 判断当前用户是否命中任一角色。
     */
    hasAnyRole(roleCodes) {
      const current = this.userInfo?.roleCodes || []
      if (current.length === 0) {
        return (roleCodes || []).includes('user')
      }
      return (roleCodes || []).some((item) => current.includes(item))
    },

    /**
     * 作用：
     * 判断当前用户是否拥有指定菜单权限。
     */
    hasMenu(menuKey) {
      const menus = this.userInfo?.menuKeys || []
      return menus.includes(menuKey)
    },

    /**
     * 作用：
     * 判断当前用户是否命中任一菜单权限。
     */
    hasAnyMenu(menuKeys) {
      const menus = this.userInfo?.menuKeys || []
      return (menuKeys || []).some((key) => menus.includes(key))
    },

    /**
     * 作用：
     * 退出登录并清理本地会话。
     *
     * 副作用：
     * 默认会通知后端清理登录态；即使后端退出失败，也会清掉本地会话。
     */
    async logout(callServer = true) {
      if (callServer) {
        try {
          await logoutApi()
        } catch (error) {
          // 后端退出失败时，仍然清理本地会话，避免前端残留脏状态。
        }
      }
      this.clearSession()
    }
  }
})
