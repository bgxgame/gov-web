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

describe('page api cancel keys', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  /**
   * 作用：验证项目分页接口会携带固定取消键，避免快速查询时旧请求继续占用网络资源。
   */
  it('should attach cancel key for project page requests', async () => {
    requestGet.mockResolvedValue({ data: { records: [], total: 0 } })
    const { fetchProjectPageByForm } = await import('../../src/api/project')

    await fetchProjectPageByForm({ projectName: '测试项目' }, { pageNum: 1, pageSize: 10 })

    expect(requestGet).toHaveBeenCalledWith(
      '/project/page',
      expect.objectContaining({
        cancelKey: 'project:page'
      })
    )
  })

  /**
   * 作用：验证审批中心待办和已办分页都会通过取消键避免同类重复请求并发堆积。
   */
  it('should attach cancel keys for flow page requests', async () => {
    requestGet.mockResolvedValue({ data: { records: [], total: 0 } })
    const { fetchTodoPage, fetchDonePage } = await import('../../src/api/flow')

    await fetchTodoPage({ pageNum: 1, pageSize: 10 })
    await fetchDonePage({ pageNum: 2, pageSize: 20 })

    expect(requestGet).toHaveBeenNthCalledWith(
      1,
      '/flow/todo',
      expect.objectContaining({ cancelKey: 'flow:todo' })
    )
    expect(requestGet).toHaveBeenNthCalledWith(
      2,
      '/flow/done',
      expect.objectContaining({ cancelKey: 'flow:done' })
    )
  })

  /**
   * 作用：验证系统管理分页接口会携带各自的取消键，减少快速切筛选条件时的冗余请求。
   */
  it('should attach cancel keys for system page requests', async () => {
    requestGet.mockResolvedValue({ data: { records: [], total: 0 } })
    const { fetchUserPageByForm, fetchRolePageByForm, fetchAuditPageByForm, fetchFrontendMonitorPageByForm } =
      await import('../../src/api/system')

    await fetchUserPageByForm({ username: 'admin' }, { pageNum: 1, pageSize: 10 })
    await fetchRolePageByForm({ roleName: '管理员' }, { pageNum: 1, pageSize: 10 })
    await fetchAuditPageByForm({ keyword: '超级管理员' }, { pageNum: 1, pageSize: 20 })
    await fetchFrontendMonitorPageByForm({ keyword: '慢请求' }, { pageNum: 1, pageSize: 20 })

    expect(requestGet).toHaveBeenNthCalledWith(
      1,
      '/system/user/page',
      expect.objectContaining({ cancelKey: 'system:user-page' })
    )
    expect(requestGet).toHaveBeenNthCalledWith(
      2,
      '/system/role/page',
      expect.objectContaining({ cancelKey: 'system:role-page' })
    )
    expect(requestGet).toHaveBeenNthCalledWith(
      3,
      '/system/audit/page',
      expect.objectContaining({ cancelKey: 'system:audit-page' })
    )
    expect(requestGet).toHaveBeenNthCalledWith(
      4,
      '/system/frontend-monitor/page',
      expect.objectContaining({ cancelKey: 'system:frontend-monitor-page' })
    )
  })

  /**
   * 作用：验证 `/system/me` 补拉权限时也会复用取消键，避免极端切页下重复并发。
   */
  it('should attach cancel key for current user request', async () => {
    requestGet.mockResolvedValue({ data: {} })
    const { getCurrentUser } = await import('../../src/api/auth')

    await getCurrentUser()

    expect(requestGet).toHaveBeenCalledWith('/system/me', expect.objectContaining({ cancelKey: 'auth:me' }))
  })
})
