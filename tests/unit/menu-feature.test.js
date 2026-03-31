import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('menu feature flags', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllEnvs()
  })

  it('should keep all menus enabled when env is empty', async () => {
    const { filterEnabledMenuKeys, isMenuEnabled } = await import('../../src/utils/menu-feature')

    expect(isMenuEnabled('dashboard:view')).toBe(true)
    expect(filterEnabledMenuKeys(['dashboard:view', 'project:manage'])).toEqual(['dashboard:view', 'project:manage'])
  })

  it('should hide menu keys declared in env', async () => {
    vi.stubEnv('VITE_APP_HIDDEN_MENUS', 'dashboard:view, system:audit')

    const { filterEnabledMenuKeys, isMenuEnabled } = await import('../../src/utils/menu-feature')

    expect(isMenuEnabled('dashboard:view')).toBe(false)
    expect(isMenuEnabled('project:manage')).toBe(true)
    expect(filterEnabledMenuKeys(['dashboard:view', 'project:manage', 'system:audit'])).toEqual(['project:manage'])
  })
})
