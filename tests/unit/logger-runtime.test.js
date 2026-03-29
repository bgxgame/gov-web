import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * 职责：验证前端运行时异常会进入统一日志缓冲。
 * 为什么存在：浏览器脚本错误和未处理 Promise 是线上真实问题来源，需要确保可观测链路稳定。
 * 关联链路：logger、window error、unhandledrejection。
 */

describe('logger runtime observers', () => {
  beforeEach(() => {
    vi.resetModules()
    window.sessionStorage.clear()
    window.localStorage.clear()
    delete window.__GOV_APP_LOGS__
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should buffer browser runtime errors after installing observers', async () => {
    const { installRuntimeErrorObservers } = await import('../../src/utils/logger')

    installRuntimeErrorObservers()
    window.dispatchEvent(new ErrorEvent('error', { message: '页面脚本异常', filename: '/src/test.js', lineno: 8, colno: 3 }))

    const logs = window.__GOV_APP_LOGS__ || []
    expect(logs.length).toBeGreaterThan(0)
    expect(logs[logs.length - 1].level).toBe('error')
    expect(logs[logs.length - 1].args[0]).toBe('浏览器运行时异常')
  })
})
