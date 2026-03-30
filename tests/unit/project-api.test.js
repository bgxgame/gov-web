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
})
