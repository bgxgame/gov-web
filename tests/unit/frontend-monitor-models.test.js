import { describe, expect, it } from 'vitest'
import { buildFrontendMonitorPageParams } from '../../src/utils/frontend-monitor-models'

describe('frontend-monitor-models', () => {
  it('should normalize frontend monitor page params', () => {
    const params = buildFrontendMonitorPageParams(
      {
        keyword: ' admin ',
        deptName: ' 综合部门 ',
        logLevel: 'warn',
        logType: 'request',
        pagePath: ' /project/manage ',
        traceId: ' trace-1 ',
        timeRange: [new Date('2026-03-30T10:00:00'), new Date('2026-03-30T10:30:00')]
      },
      { pageNum: 2, pageSize: 50 }
    )

    expect(params).toMatchObject({
      pageNum: 2,
      pageSize: 50,
      keyword: 'admin',
      deptName: '综合部门',
      logLevel: 'warn',
      logType: 'request',
      pagePath: '/project/manage',
      traceId: 'trace-1',
      startTime: '2026-03-30 10:00:00',
      endTime: '2026-03-30 10:30:00'
    })
  })
})
