const TRACE_ID_HEADER = 'X-Trace-Id'
let latestTraceId = ''

/**
 * 职责：统一生成、透传并记录前端请求链路追踪 ID。
 * 为什么存在：让浏览器请求、后端日志与审计日志能按同一条 traceId 串起来，方便排障。
 * 关键输入输出：输入为请求配置或响应头，输出为可复用的 traceId 字符串。
 * 关联链路：request.js、后端 TraceIdFilter、审计日志。
 */

function randomSegment() {
  return Math.random().toString(16).slice(2, 10)
}

/**
 * 作用：生成新的 traceId。
 */
export function createTraceId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '')
  }
  return `${Date.now().toString(16)}${randomSegment()}${randomSegment()}`
}

/**
 * 作用：从请求配置中取出或生成 traceId。
 */
export function ensureTraceId(config) {
  const current = config?.metadata?.traceId
  if (current) return current
  return createTraceId()
}

/**
 * 作用：记录最近一次命中的 traceId，方便错误排查时回看。
 */
export function setLatestTraceId(traceId) {
  latestTraceId = String(traceId || '').trim()
  return latestTraceId
}

/**
 * 作用：获取最近一次链路追踪 ID。
 */
export function getLatestTraceId() {
  return latestTraceId
}

export { TRACE_ID_HEADER }
