import { describe, expect, it } from 'vitest'
import { buildFlowApprovalPayload, buildFlowPageParams } from '../../src/utils/flow-models'

/**
 * 职责：验证审批模型辅助函数的纯数据转换逻辑。
 * 为什么存在：这些函数直接决定审批接口请求参数的契约，适合用最轻量的单测覆盖。
 * 关联链路：审批列表分页、审批通过/驳回。
 */

describe('flow-models', () => {
  /**
   * 作用：验证分页辅助函数会稳定生成待办/已办接口所需参数。
   */
  it('should build page params for flow list APIs', () => {
    expect(buildFlowPageParams({ pageNum: 2, pageSize: 20 })).toEqual({
      pageNum: 2,
      pageSize: 20
    })
  })

  /**
   * 作用：验证审批动作辅助函数会稳定生成任务审批请求体。
   */
  it('should build approval payload for task decision', () => {
    expect(buildFlowApprovalPayload('task-1', true)).toEqual({
      taskId: 'task-1',
      approved: true
    })
  })
})
