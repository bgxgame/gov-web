import { defineStore } from 'pinia'
import { getCurrentUser, login as loginApi, logout as logoutApi } from '../api/auth'
import { filterEnabledMenuKeys, isMenuEnabled } from '../utils/menu-feature'
import {
  readJsonFromLocalStorage,
  readToken,
  writeToken,
  writeUserInfoCache
} from '../utils/browser-storage'

const USER_KEY = 'user_info'

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
  const parsed = readJsonFromLocalStorage(USER_KEY)
  return parsed ? resolveHomePathByMenuKeys(parsed?.menuKeys) : null
}

/**
 * 职责：标准化历史角色编码，统一成前端只关心的 `admin / dept_leader / user`。
 * 为什么存在：后端或历史数据里可能混用多种角色编码写法，前端不应到处兼容。
 * 关键输入输出：输入为任意角色编码字符串，输出为标准化后的角色编码或 `null`。
 * 关联链路：登录、/system/me、菜单权限判断、页面按钮权限判断。
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
 * 职责：标准化角色数组并确保始终保留基础 `user` 角色。
 * 为什么存在：即使后端未显式返回普通用户角色，前端权限模型也需要保持稳定。
 * 关键输入输出：输入为角色数组，输出为去重后的标准角色数组。
 * 关联链路：路由守卫、侧边栏菜单、页面操作权限。
 */
function normalizeRoleCodes(roleCodes) {
  if (!Array.isArray(roleCodes)) return []
  const normalized = roleCodes.map((item) => normalizeRoleCode(item)).filter(Boolean)
  if (!normalized.includes('user')) normalized.push('user')
  return [...new Set(normalized)]
}

/**
 * 职责：标准化菜单权限数组。
 * 为什么存在：去空值、去空白、去重，避免历史脏数据影响菜单显示和权限判断。
 * 关键输入输出：输入为菜单键数组，输出为规范化后的菜单键数组。
 * 关联链路：主布局菜单、默认首页解析、页面访问权限。
 */
function normalizeMenuKeys(menuKeys) {
  if (!Array.isArray(menuKeys)) return []
  return filterEnabledMenuKeys(menuKeys.map((item) => String(item || '').trim()).filter(Boolean))
}

/**
 * 职责：从本地存储恢复用户信息并完成标准化。
 * 为什么存在：刷新浏览器后需要尽快恢复会话，不应等接口返回后才具备基本权限信息。
 * 关键输入输出：输入为 localStorage 中的原始 JSON，输出为标准化后的用户对象或 `null`。
 * 关联链路：页面刷新、登录后回显、路由守卫初始化。
 */
function parseUserInfo() {
  const data = readJsonFromLocalStorage(USER_KEY)
  if (!data) return null
  return {
    ...data,
    roleCodes: normalizeRoleCodes(data?.roleCodes),
    menuKeys: normalizeMenuKeys(data?.menuKeys)
  }
}

/**
 * 职责：把登录或 `/system/me` 返回的用户载荷规整成 store 内部统一结构。
 * 为什么存在：前端后续逻辑不应该关心接口是否缺省了某些字段或角色编码是否规范。
 * 关键输入输出：输入为接口返回数据和可选兜底用户名，输出为标准化用户对象。
 * 关联链路：登录、会话恢复、权限刷新。
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

function hasCompleteUserInfoPayload(data) {
  return Array.isArray(data?.roleCodes) && Array.isArray(data?.menuKeys)
}

/**
 * 职责：统一维护登录态、当前用户信息、菜单权限和默认首页。
 * 为什么存在：把“认证态”和“权限态”集中在一个 store 中，避免页面和路由各自维护会话细节。
 * 关键输入输出：输入来自登录接口、/system/me 和本地缓存；输出给路由守卫、布局菜单和页面权限判断。
 * 关联链路：登录 -> 初始化用户信息 -> 计算默认首页 -> 路由权限判断。
 */
export const useSessionStore = defineStore('session', {
  state: () => {
    const cachedUserInfo = parseUserInfo()
    return {
      token: readToken() || '',
      userInfo: cachedUserInfo,
      userInfoSource: cachedUserInfo ? 'cache' : '',
      _userInfoPromise: null,
      _lastEnsureServerAt: 0
    }
  },
  getters: {
    isAuthenticated: (state) => Boolean(state.token),
    homePath: (state) => resolveHomePathByMenuKeys(state.userInfo?.menuKeys || [])
  },
  actions: {
    /**
     * 职责：设置并持久化 token。
     * 为什么存在：统一 token 写入和清理入口，避免页面直接操作 localStorage。
     * 关键输入输出：输入为 token 字符串，输出为更新后的会话状态。
     * 关联链路：登录、401 清理、退出登录。
     */
    setToken(token) {
      this.token = token || ''
      writeToken(this.token)
    },

    /**
     * 职责：设置并持久化当前用户信息。
     * 为什么存在：统一 user_info 的写入格式，避免本地缓存结构漂移。
     * 关键输入输出：输入为标准化用户对象或 `null`，输出为更新后的用户信息状态。
     * 关联链路：登录、会话恢复、权限刷新、退出登录。
     */
    setUserInfo(userInfo, source = 'manual') {
      this.userInfo = userInfo || null
      this.userInfoSource = userInfo ? source : ''
      if (userInfo && (source === 'server' || source === 'login')) {
        this._lastEnsureServerAt = Date.now()
      }
      writeUserInfoCache(userInfo)
    },

    /**
     * 职责：清理本地会话状态。
     * 为什么存在：退出登录、401 失效或强制回到登录页时都需要统一复用这套清理逻辑。
     * 关键输入输出：输入为空，输出为 token、用户信息和补拉 Promise 被重置。
     * 关联链路：退出登录、401、权限恢复失败兜底。
     */
    clearSession() {
      this._userInfoPromise = null
      this._lastEnsureServerAt = 0
      this.userInfoSource = ''
      this.setToken('')
      this.setUserInfo(null)
    },

    /**
     * 职责：执行登录并初始化完整会话。
     * 为什么存在：统一处理 token 落盘、用户信息标准化以及必要时的 `/system/me` 补拉。
     * 关键输入输出：输入为登录表单，输出为登录接口响应。
     * 关联链路：登录页 -> store.login -> 计算默认首页 -> 主布局。
     */
    async login(payload) {
      const res = await loginApi(payload)
      this.setToken(res.data.tokenValue)
      this.setUserInfo(normalizeUserInfo(res.data, payload.username), 'login')

      if (!hasCompleteUserInfoPayload(res.data)) {
        try {
          await this.refreshUserInfo()
        } catch (error) {
          // 登录主流程优先，补拉失败时先保留登录接口返回的上下文。
        }
      }

      return res
    },

    /**
     * 职责：显式刷新当前登录用户信息。
     * 为什么存在：某些权限或菜单变更后需要强制以服务端结果为准。
     * 关键输入输出：输入为空，输出为刷新后的用户对象。
     * 关联链路：权限刷新、菜单恢复、调试与回归验证。
     */
    async refreshUserInfo() {
      if (!this.token) return null
      const res = await getCurrentUser()
      const userInfo = normalizeUserInfo(res.data, this.userInfo?.username)
      this.setUserInfo(userInfo, 'server')
      this._lastEnsureServerAt = Date.now()
      return userInfo
    },

    /**
     * 职责：确保当前用户信息已就绪，并对同一时刻的重复补拉做单航复用。
     * 为什么存在：路由守卫和页面恢复经常会并发请求 `/system/me`，需要避免重复打接口。
     * 关键输入输出：输入为是否强制刷新，输出为当前用户对象或 `null`。
     * 关联链路：路由守卫、菜单切换、刷新页面后的权限恢复。
     */
    async ensureUserInfo(forceRefresh = false, options = {}) {
      if (!this.token) return null
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
            this._lastEnsureServerAt = Date.now()
            return userInfo
          })
          .finally(() => {
            this._userInfoPromise = null
          })
      }

      return this._userInfoPromise
    },

    /**
     * 职责：判断当前用户是否拥有指定角色。
     * 为什么存在：页面按钮和路由兜底需要轻量角色判断能力。
     * 关键输入输出：输入为单个角色编码，输出为布尔值。
     * 关联链路：系统管理、布局显示、权限兜底。
     */
    hasRole(roleCode) {
      const roles = this.userInfo?.roleCodes || []
      if (roles.length === 0 && roleCode === 'user') {
        return true
      }
      return roles.includes(roleCode)
    },

    /**
     * 职责：判断当前用户是否命中任一角色。
     * 为什么存在：路由 meta.roles 场景通常只关心“是否命中任一角色”。
     * 关键输入输出：输入为角色编码数组，输出为布尔值。
     * 关联链路：路由守卫。
     */
    hasAnyRole(roleCodes) {
      const current = this.userInfo?.roleCodes || []
      if (current.length === 0) {
        return (roleCodes || []).includes('user')
      }
      return (roleCodes || []).some((item) => current.includes(item))
    },

    /**
     * 职责：判断当前用户是否拥有指定菜单权限。
     * 为什么存在：菜单键是本项目的主权限来源，需要统一封装。
     * 关键输入输出：输入为单个菜单键，输出为布尔值。
     * 关联链路：主布局菜单、按钮权限、路由守卫。
     */
    hasMenu(menuKey) {
      const menus = this.userInfo?.menuKeys || []
      return isMenuEnabled(menuKey) && menus.includes(menuKey)
    },

    /**
     * 职责：判断当前用户是否命中任一菜单权限。
     * 为什么存在：多数菜单和路由只要求命中同组权限中的一个即可。
     * 关键输入输出：输入为菜单键数组，输出为布尔值。
     * 关联链路：侧边栏、路由访问控制。
     */
    hasAnyMenu(menuKeys) {
      const menus = this.userInfo?.menuKeys || []
      const enabledMenuKeys = filterEnabledMenuKeys(menuKeys)
      if (enabledMenuKeys.length === 0) return false
      return enabledMenuKeys.some((key) => menus.includes(key))
    },

    /**
     * 职责：退出登录并清理本地会话。
     * 为什么存在：即使后端退出失败，前端也必须保证本地会话及时清空。
     * 关键输入输出：输入为是否调用后端退出接口，输出为已清理的会话状态。
     * 关联链路：右上角退出登录、401 兜底。
     */
    async logout(callServer = true) {
      if (callServer) {
        try {
          await logoutApi()
        } catch (error) {
          // 后端退出失败时，仍然清理本地会话，避免残留脏状态。
        }
      }
      this.clearSession()
    }
  }
})
