import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * 职责：验证统一反馈工具对取消动作和异常兜底的处理。
 * 为什么存在：很多页面依赖确认框取消静默、真实异常提示兜底，这部分一旦回退会直接影响用户体验。
 * 关联链路：删除确认、提交审批、审批通过/驳回。
 */

const messageError = vi.fn()
const messageSuccess = vi.fn()
const messageWarning = vi.fn()

vi.mock('element-plus', () => ({
  ElMessage: {
    error: messageError,
    success: messageSuccess,
    warning: messageWarning
  },
  ElMessageBox: {
    confirm: vi.fn()
  }
}))

describe('feedback utils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should detect cancel and close errors', async () => {
    const { isCancelError } = await import('../../src/utils/feedback')

    expect(isCancelError('cancel')).toBe(true)
    expect(isCancelError({ action: 'close' })).toBe(true)
    expect(isCancelError(new Error('boom'))).toBe(false)
  })

  it('should show fallback error only when message has not been handled', async () => {
    const { handleActionError } = await import('../../src/utils/feedback')

    handleActionError({ message: 'Network Error' }, '提交失败，请稍后重试')
    expect(messageError).toHaveBeenCalledTimes(1)

    handleActionError({ __messageHandled: true, message: 'ignored' }, '不会重复提示')
    expect(messageError).toHaveBeenCalledTimes(1)
  })
})
