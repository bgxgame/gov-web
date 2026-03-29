import { describe, expect, it } from 'vitest'
import { buildAuditPageParams } from '../../src/utils/audit-models'

/**
 * 职责：验证审计页面参数构建辅助函数的行为稳定性。
 * 为什么存在：该函数承担查询参数收敛和时间格式化，回归成本高。
 * 关键输入输出：输入为筛选表单/分页对象，输出为后端分页查询参数。
 * 关联链路：审计日志页面 -> /system/audit/page。
 */
describe('audit-models', () => {
  /**
   * 作用：应正确裁剪文本、转换状态码和格式化时间范围。
   */
  it('should build normalized audit page params', () => {
    const params = buildAuditPageParams(
      {
        keyword: ' admin ',
        requestMethod: ' POST ',
        requestUri: ' /api/flow/approve ',
        httpStatus: '200',
        clientIp: ' 10.0.0.1 ',
        timeRange: [new Date('2026-03-29T10:07:14'), new Date('2026-03-29T10:08:00')]
      },
      { pageNum: 2, pageSize: 50 }
    )

    expect(params.pageNum).toBe(2)
    expect(params.pageSize).toBe(50)
    expect(params.keyword).toBe('admin')
    expect(params.requestMethod).toBe('POST')
    expect(params.requestUri).toBe('/api/flow/approve')
    expect(params.httpStatus).toBe(200)
    expect(params.clientIp).toBe('10.0.0.1')
    expect(typeof params.startTime).toBe('string')
    expect(typeof params.endTime).toBe('string')
  })

  /**
   * 作用：空值应被收敛为 undefined，避免发送无效查询参数。
   */
  it('should collapse blank values', () => {
    const params = buildAuditPageParams(
      {
        keyword: ' ',
        requestMethod: '',
        requestUri: '',
        httpStatus: '',
        clientIp: '',
        timeRange: []
      },
      { pageNum: 1, pageSize: 20 }
    )

    expect(params.keyword).toBeUndefined()
    expect(params.requestMethod).toBeUndefined()
    expect(params.requestUri).toBeUndefined()
    expect(params.httpStatus).toBeUndefined()
    expect(params.clientIp).toBeUndefined()
    expect(params.startTime).toBeUndefined()
    expect(params.endTime).toBeUndefined()
  })
})
