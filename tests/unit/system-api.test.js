import { beforeEach, describe, expect, it, vi } from 'vitest'

const requestGet = vi.fn()
const requestPost = vi.fn()
const requestPut = vi.fn()
const requestDelete = vi.fn()

vi.mock('../../src/utils/request', () => ({
  default: {
    get: requestGet,
    post: requestPost,
    put: requestPut,
    delete: requestDelete
  }
}))

describe('system api cache', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  /**
   * 作用：验证轻量基础数据接口会在 API 层复用缓存，避免多个页面重复拉取同一份选项数据。
   */
  it('should cache user simple list requests', async () => {
    requestGet.mockResolvedValue({ data: [{ id: 1, username: 'admin' }] })

    const { getUserSimple } = await import('../../src/api/system')

    const first = await getUserSimple()
    const second = await getUserSimple()

    expect(first.data).toEqual([{ id: 1, username: 'admin' }])
    expect(second.data).toEqual([{ id: 1, username: 'admin' }])
    expect(requestGet).toHaveBeenCalledTimes(1)
    expect(requestGet).toHaveBeenCalledWith('/system/user/simple')
  })

  /**
   * 作用：验证相关写操作完成后，会失效对应缓存，保证后续再次进入页面能拿到最新数据。
   */
  it('should invalidate user simple cache after saving user form', async () => {
    requestGet.mockResolvedValue({ data: [{ id: 1, username: 'admin' }] })
    requestPost.mockResolvedValue({ data: true })

    const { getUserSimple, saveUserForm } = await import('../../src/api/system')

    await getUserSimple()
    await saveUserForm({ username: 'tester', realName: '测试用户' })
    await getUserSimple()

    expect(requestGet).toHaveBeenCalledTimes(2)
    expect(requestPost).toHaveBeenCalledTimes(1)
  })
})
