import request from '../utils/request'
import { buildFlowApprovalPayload, buildFlowPageParams } from '../utils/flow-models'

/**
 * 审批流相关 API 封装。
 * 主要服务于审批中心页面，把待办、已办和审批动作统一沉到这一层。
 */

/** 按原始参数获取待办列表。 */
export const getTodoList = (params) => request.get('/flow/todo', { params })

/** 按原始参数获取已办列表。 */
export const getDoneList = (params) => request.get('/flow/done', { params })

/** 提交审批动作。 */
export const approveTask = (payload) => request.post('/flow/approve', payload)

/** 根据分页对象获取待办分页。 */
export const fetchTodoPage = (pagination) => getTodoList(buildFlowPageParams(pagination))

/** 根据分页对象获取已办分页。 */
export const fetchDonePage = (pagination) => getDoneList(buildFlowPageParams(pagination))

/** 根据任务 ID 和审批结果提交审批动作。 */
export const approveTaskDecision = (taskId, approved) => approveTask(buildFlowApprovalPayload(taskId, approved))
