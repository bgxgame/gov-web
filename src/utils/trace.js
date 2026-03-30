const TRACE_ID_HEADER = 'X-Trace-Id'
let latestTraceId = ''

/**
 * 统一生成、透传并记录前端请求链路追踪 ID。
 * 存在原因：让浏览器请求、后端日志与审计日志能够按同一条 traceId 串联定位。
 * 输入输出：输入为请求配置或响应头，输出为可复用的 traceId 字符串。
 * 关联链路：request.js、后端 TraceId 过滤器、审计日志、性能日志。
 */

function randomSegment() {
  return Math.random().toString(16).slice(2, 10)
}

/**
 * 生成新的 traceId。
 */
export function createTraceId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '')
  }
  return `${Date.now().toString(16)}${randomSegment()}${randomSegment()}`
}

/**
 * 从请求配置中读取或补齐 traceId。
 */
export function ensureTraceId(config) {
  const current = config?.metadata?.traceId
  if (current) return current
  return createTraceId()
}

/**
 * 记录最近一次命中的 traceId，便于问题回溯。
 */
export function setLatestTraceId(traceId) {
  latestTraceId = String(traceId || '').trim()
  return latestTraceId
}

/**
 * 获取最近一次链路追踪 ID。
 */
export function getLatestTraceId() {
  return latestTraceId
}

export { TRACE_ID_HEADER }
