/**
 * Build query params for paged flow task APIs.
 *
 * @param {{ pageNum: number, pageSize: number }} pagination
 * @returns {{ pageNum: number, pageSize: number }}
 */
export function buildFlowPageParams(pagination) {
  return {
    pageNum: pagination.pageNum,
    pageSize: pagination.pageSize
  }
}

/**
 * Build the payload accepted by the approve task API.
 *
 * @param {string|number} taskId
 * @param {boolean} approved
 * @returns {{ taskId: string|number, approved: boolean }}
 */
export function buildFlowApprovalPayload(taskId, approved) {
  return {
    taskId,
    approved
  }
}
