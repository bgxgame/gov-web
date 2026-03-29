import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * 职责：验证会话仓库的登录态与首页解析逻辑。
 * 为什么存在：会话仓库承担 token 持久化、角色标准化和首页计算，是前端权限链路的核心。
 * 关联链路：登录、刷新当前用户、退出登录、首页跳转。
 */

const loginApi = vi.fn()
const getCurrentUser = vi.fn()
const logoutApi = vi.fn()

vi.mock('../../src/api/auth', () => ({
  login: loginApi,
  getCurrentUser,
  logout: logoutApi
}))

describe('session store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
    setActivePinia(createPinia())
  })

  /**
   * 作用：验证登录动作会标准化角色和菜单，并把 token 与用户信息落盘。
   */
  it('should login, persist token and normalize roles / menus', async () => {
    loginApi.mockResolvedValue({
      data: {
        tokenValue: 'token-1',
        userId: 1,
        username: 'admin',
        roleCodes: ['Administrator'],
        menuKeys: [' dashboard:view ', 'dashboard:view', 'system:user']
      }
    })

    const { useSessionStore } = await import('../../src/stores/session')
    const store = useSessionStore()

    await store.login({ username: 'admin', password: 'secret' })

    expect(store.token).toBe('token-1')
    expect(store.userInfo.roleCodes).toEqual(['admin', 'user'])
    expect(store.userInfo.menuKeys).toEqual(['dashboard:view', 'system:user'])
    expect(store.homePath).toBe('/dashboard')
    expect(getCurrentUser).not.toHaveBeenCalled()
    expect(JSON.parse(window.localStorage.getItem('user_info')).menuKeys).toEqual(['dashboard:view', 'system:user'])
  })

  /**
   * 作用：验证刷新当前用户信息后，会重新计算首个允许访问的首页路径。
   */
  it('should refresh current user info and choose first allowed home path', async () => {
    window.localStorage.setItem('token', 'token-2')
    getCurrentUser.mockResolvedValue({
      data: {
        userId: 2,
        username: 'leader',
        roleCodes: ['deptleader'],
        menuKeys: ['project:engineering', 'system:user']
      }
    })

    const { useSessionStore } = await import('../../src/stores/session')
    const store = useSessionStore()

    await store.refreshUserInfo()

    expect(store.userInfo.roleCodes).toEqual(['dept_leader', 'user'])
    expect(store.homePath).toBe('/project/engineering')
  })

  /**
   * 作用：验证退出登录时即使跳过服务端请求，也会清空本地会话状态。
   */
  it('should clear local session after logout even when server call is skipped', async () => {
    window.localStorage.setItem('token', 'token-3')
    window.localStorage.setItem('user_info', JSON.stringify({ username: 'tester', roleCodes: ['user'], menuKeys: ['project:manage'] }))

    const { useSessionStore } = await import('../../src/stores/session')
    const store = useSessionStore()

    await store.logout(false)

    expect(store.token).toBe('')
    expect(store.userInfo).toBeNull()
    expect(window.localStorage.getItem('token')).toBeNull()
  })
})
