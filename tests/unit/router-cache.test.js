import { describe, expect, it } from 'vitest'
import { CACHEABLE_VIEW_NAMES, shouldKeepAliveRoute } from '../../src/utils/router-cache'

describe('router-cache', () => {
  it('should expose stable cacheable route names for core pages', () => {
    expect(CACHEABLE_VIEW_NAMES).toEqual([
      'Dashboard',
      'ProjectManage',
      'EngineeringManage',
      'UserManage',
      'DeptManage',
      'RoleManage',
      'AuditManage',
      'FrontendMonitorManage'
    ])
  })

  it('should keep alive route when meta.keepAlive is enabled', () => {
    expect(shouldKeepAliveRoute({ name: 'ProjectManage', meta: { keepAlive: true } })).toBe(true)
  })

  it('should skip route cache when keepAlive flag is missing', () => {
    expect(shouldKeepAliveRoute({ name: 'ProjectManage', meta: {} })).toBe(false)
  })

  it('should skip route cache for unknown route names', () => {
    expect(shouldKeepAliveRoute({ name: 'Login', meta: { keepAlive: true } })).toBe(false)
  })
})
