import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('frontend-monitor', () => {
  beforeEach(() => {
    vi.resetModules()
    window.localStorage.clear()
    window.sessionStorage.clear()
    document.cookie = 'XSRF-TOKEN=csrf-demo; Path=/'
    window.fetch = vi.fn().mockResolvedValue({ ok: true })
  })

  afterEach(async () => {
    const { resetFrontendMonitorForTest } = await import('../../src/utils/frontend-monitor')
    resetFrontendMonitorForTest()
    vi.restoreAllMocks()
  })

  it('should collect warn log, attach csrf header and flush it to backend monitor endpoint', async () => {
    const { installFrontendMonitor, flushFrontendMonitorLogs, getFrontendMonitorQueueSize } = await import('../../src/utils/frontend-monitor')
    const { logger } = await import('../../src/utils/logger')

    installFrontendMonitor()
    logger.warn('检测到慢请求', { url: '/api/project/page', traceId: 'trace-demo' })

    expect(getFrontendMonitorQueueSize()).toBe(1)
    await flushFrontendMonitorLogs()

    expect(window.fetch).toHaveBeenCalledTimes(1)
    const [url, options] = window.fetch.mock.calls[0]
    expect(url).toBe('/api/system/frontend-monitor/report')
    expect(options.headers['X-CSRF-Token']).toBe('csrf-demo')
    const payload = JSON.parse(options.body)
    expect(payload.logs[0]).toMatchObject({
      level: 'warn',
      type: 'request',
      message: '检测到慢请求',
      traceId: 'trace-demo'
    })
  })
})
