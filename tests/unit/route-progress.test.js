import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { finishRouteProgress, startRouteProgress } from '../../src/utils/route-progress'

/**
 * 职责：验证路由切换的即时反馈样式。
 * 为什么存在：菜单切换体验依赖顶部进度条和全局“处理中”状态，必须有测试兜底。
 * 关联链路：路由守卫、菜单切换、route-progress。
 */

describe('route progress', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    document.body.className = ''
    const existingBar = document.getElementById('route-progress-bar')
    if (existingBar) {
      existingBar.remove()
    }
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should toggle route pending class during route progress', () => {
    const token = startRouteProgress()

    expect(document.body.classList.contains('route-pending')).toBe(true)

    finishRouteProgress(token)
    vi.advanceTimersByTime(250)

    expect(document.body.classList.contains('route-pending')).toBe(false)
  })
})
