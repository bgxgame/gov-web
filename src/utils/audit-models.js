/**
 * @typedef {Object} AuditPageQueryForm
 * @property {string} [keyword]
 * @property {string} [requestMethod]
 * @property {string} [requestUri]
 * @property {number|string|undefined} [httpStatus]
 * @property {string} [clientIp]
 * @property {[Date|string, Date|string]|[]} [timeRange]
 */

/**
 * @typedef {Object} PaginationModel
 * @property {number} pageNum
 * @property {number} pageSize
 */

/**
 * 职责：把审计页面查询表单转换为后端分页接口参数。
 * 为什么存在：避免页面直接拼接参数对象，统一做空值收敛与时间格式化。
 * 关键输入输出：输入为查询表单和分页对象，输出为 `/system/audit/page` 参数对象。
 * 关联链路：审计日志页面 -> getAuditPage。
 *
 * @param {AuditPageQueryForm} queryForm
 * @param {PaginationModel} pagination
 * @returns {Record<string, unknown>}
 */
export function buildAuditPageParams(queryForm, pagination) {
  const [startTime, endTime] = normalizeTimeRange(queryForm?.timeRange)
  return {
    pageNum: Number(pagination?.pageNum || 1),
    pageSize: Number(pagination?.pageSize || 20),
    keyword: normalizeOptionalText(queryForm?.keyword),
    requestMethod: normalizeOptionalText(queryForm?.requestMethod),
    requestUri: normalizeOptionalText(queryForm?.requestUri),
    httpStatus: normalizeStatus(queryForm?.httpStatus),
    clientIp: normalizeOptionalText(queryForm?.clientIp),
    startTime,
    endTime
  }
}

function normalizeOptionalText(value) {
  const text = String(value ?? '').trim()
  return text ? text : undefined
}

function normalizeStatus(value) {
  if (value === undefined || value === null || value === '') return undefined
  const status = Number(value)
  return Number.isFinite(status) ? status : undefined
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
