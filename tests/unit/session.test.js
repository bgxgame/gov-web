import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

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
    vi.resetModules()
    vi.unstubAllEnvs()
    window.localStorage.clear()
    window.sessionStorage.clear()
    document.cookie = 'XSRF-TOKEN=; Max-Age=0; Path=/'
    setActivePinia(createPinia())
  })

  it('should login, cache safe user info in session storage and normalize roles / menus', async () => {
    loginApi.mockResolvedValue({
      data: {
        userId: 1,
        username: 'admin',
        roleCodes: ['Administrator'],
        menuKeys: [' dashboard:view ', 'dashboard:view', 'system:user']
      }
    })
    document.cookie = 'XSRF-TOKEN=csrf-demo; Path=/'

    const { useSessionStore } = await import('../../src/stores/session')
    const store = useSessionStore()

    await store.login({ username: 'admin', password: 'secret' })

    expect(store.isAuthenticated).toBe(true)
    expect(store.userInfo.roleCodes).toEqual(['admin', 'user'])
    expect(store.userInfo.menuKeys).toEqual(['dashboard:view', 'system:user'])
    expect(store.homePath).toBe('/dashboard')
    expect(getCurrentUser).not.toHaveBeenCalled()
    expect(JSON.parse(window.sessionStorage.getItem('user_info')).menuKeys).toEqual(['dashboard:view', 'system:user'])
    expect(window.localStorage.getItem('token')).toBeNull()
  })

  it('should refresh current user info when csrf cookie indicates an active session', async () => {
    document.cookie = 'XSRF-TOKEN=csrf-demo; Path=/'
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

  it('should clear session storage and csrf hint after logout even when server call is skipped', async () => {
    document.cookie = 'XSRF-TOKEN=csrf-demo; Path=/'
    window.sessionStorage.setItem(
      'user_info',
      JSON.stringify({ username: 'tester', roleCodes: ['user'], menuKeys: ['project:manage'] })
    )

    const { useSessionStore } = await import('../../src/stores/session')
    const store = useSessionStore()

    await store.logout(false)

    expect(store.isAuthenticated).toBe(false)
    expect(store.userInfo).toBeNull()
    expect(window.sessionStorage.getItem('user_info')).toBeNull()
    expect(document.cookie).not.toContain('XSRF-TOKEN=csrf-demo')
  })

  it('should resolve home path from cached user info', async () => {
    window.sessionStorage.setItem('user_info', JSON.stringify({ menuKeys: ['project:manage'] }))

    const { resolveHomePathFromCachedUserInfo } = await import('../../src/stores/session')

    expect(resolveHomePathFromCachedUserInfo()).toBe('/project/manage')
  })

  it('should skip hidden menus when resolving home path', async () => {
    vi.stubEnv('VITE_APP_HIDDEN_MENUS', 'dashboard:view,system:user')
    window.sessionStorage.setItem(
      'user_info',
      JSON.stringify({ menuKeys: ['dashboard:view', 'project:manage', 'system:user'] })
    )

    const { resolveFirstEnabledMenuPath, resolveHomePathFromCachedUserInfo, useSessionStore } = await import('../../src/stores/session')
    const store = useSessionStore()

    expect(resolveFirstEnabledMenuPath()).toBe('/project/manage')
    expect(resolveHomePathFromCachedUserInfo()).toBe('/project/manage')
    expect(store.homePath).toBe('/project/manage')
    expect(store.hasMenu('dashboard:view')).toBe(false)
    expect(store.hasMenu('project:manage')).toBe(true)
  })
})
