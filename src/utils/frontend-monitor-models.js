/**
 * @typedef {Object} FrontendMonitorQueryForm
 * @property {string} [keyword]
 * @property {string} [deptName]
 * @property {string} [logLevel]
 * @property {string} [logType]
 * @property {string} [pagePath]
 * @property {string} [traceId]
 * @property {[Date|string, Date|string]|[]} [timeRange]
 */

/**
 * @typedef {Object} PaginationModel
 * @property {number} pageNum
 * @property {number} pageSize
 */

/**
 * 职责：把前端监控页面查询表单转换为后端分页接口参数。
 * 为什么存在：避免页面直接拼接参数对象，统一做空值收敛与时间格式化。
 * 关键输入输出：输入为查询表单和分页对象，输出为 `/system/frontend-monitor/page` 参数对象。
 * 关联链路：前端监控页面 -> getFrontendMonitorPage。
 *
 * @param {FrontendMonitorQueryForm} queryForm
 * @param {PaginationModel} pagination
 * @returns {Record<string, unknown>}
 */
export function buildFrontendMonitorPageParams(queryForm, pagination) {
  const [startTime, endTime] = normalizeTimeRange(queryForm?.timeRange)
  return {
    pageNum: Number(pagination?.pageNum || 1),
    pageSize: Number(pagination?.pageSize || 20),
    keyword: normalizeOptionalText(queryForm?.keyword),
    deptName: normalizeOptionalText(queryForm?.deptName),
    logLevel: normalizeOptionalText(queryForm?.logLevel),
    logType: normalizeOptionalText(queryForm?.logType),
    pagePath: normalizeOptionalText(queryForm?.pagePath),
    traceId: normalizeOptionalText(queryForm?.traceId),
    startTime,
    endTime
  }
}

function normalizeOptionalText(value) {
  const text = String(value ?? '').trim()
  return text ? text : undefined
}

function normalizeTimeRange(timeRange) {
  if (!Array.isArray(timeRange) || timeRange.length !== 2) {
    return [undefined, undefined]
  }
  return [formatDateTime(timeRange[0]), formatDateTime(timeRange[1])]
}

function formatDateTime(value) {
  if (!value) return undefined
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return undefined

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}
