import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * 职责：验证用户动作日志会进入统一运行时日志缓冲。
 * 为什么存在：菜单切换、退出登录这类体验问题需要靠动作日志结合 traceId 回放现场。
 * 关联链路：layout、router、logger。
 */
describe('logger action', () => {
  beforeEach(() => {
    vi.resetModules()
    window.sessionStorage.clear()
    delete window.__GOV_APP_LOGS__
  })

  it('should buffer user action logs with sanitized payload', async () => {
    const { logUserAction } = await import('../../src/utils/logger')

    logUserAction('menu_select', {
      targetPath: '/project/manage',
      token: 'secret-token'
    })

    const logs = window.__GOV_APP_LOGS__ || []
    expect(logs.length).toBeGreaterThan(0)
    const latestLog = logs[logs.length - 1]
    expect(latestLog.level).toBe('info')
    expect(latestLog.args[0]).toBe('用户操作')
    expect(latestLog.args[1]).toMatchObject({
      action: 'menu_select',
      targetPath: '/project/manage'
    })
    expect(String(latestLog.args[1].token)).toContain('****')
  })
})
