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

describe('project api', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('should build map summary requests with summary cancel keys', async () => {
    requestGet.mockResolvedValue({ data: [] })

    const { fetchProjectMapSummaryByFilters } = await import('../../src/api/project')

    await fetchProjectMapSummaryByFilters('district', {
      province: ' 陕西省 ',
      city: ' 西安市 ',
      district: ''
    })

    expect(requestGet).toHaveBeenCalledWith(
      '/project/map/summary',
      expect.objectContaining({
        params: {
          level: 'district',
          province: '陕西省',
          city: '西安市',
          district: undefined
        },
        cancelKey: 'project:map-summary'
      })
    )
  })

  it('should upload project attachments with multipart form data', async () => {
    requestPost.mockResolvedValue({ data: { id: 1 } })

    const { uploadProjectAttachment } = await import('../../src/api/project')
    const file = new File(['demo'], 'demo.txt', { type: 'text/plain' })

    await uploadProjectAttachment(file)

    expect(requestPost).toHaveBeenCalledWith(
      '/project/file/upload',
      expect.any(FormData),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'multipart/form-data'
        })
      })
    )
  })

  it('should cleanup temporary project attachments by id list', async () => {
    requestPost.mockResolvedValue({ msg: '已清理1个临时附件' })

    const { cleanupProjectTempAttachments } = await import('../../src/api/project')

    await cleanupProjectTempAttachments([11, 12])

    expect(requestPost).toHaveBeenCalledWith('/project/file/cleanup-temp', {
      fileIds: [11, 12]
    })
  })
})
