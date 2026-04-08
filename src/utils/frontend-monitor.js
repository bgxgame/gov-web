import { appConfig } from '../config/app-config'
import { readCsrfToken } from './browser-storage'
import {
  addDocumentEventListener,
  addWindowEventListener,
  clearRuntimeInterval,
  fetchWithRuntime,
  getCurrentPath,
  getDocumentObject,
  hasWindow,
  removeDocumentEventListener,
  removeWindowEventListener,
  setRuntimeInterval
} from './browser-runtime'
import { createTraceId, getLatestTraceId, TRACE_ID_HEADER } from './trace'
import { RUNTIME_LOG_EVENT } from './logger'

const REPORTABLE_LEVELS = new Set(['warn', 'error'])
const REPORT_ENDPOINT = '/system/frontend-monitor/report'

let installed = false
let sending = false
let flushTimer = null
let pendingQueue = []

function shouldReport(log) {
  if (!appConfig.frontendMonitorEnabled || !log) return false
  const level = String(log.level || '').toLowerCase()
  if (REPORTABLE_LEVELS.has(level)) return true
  const payload = log?.args?.[1]
  return Boolean(level === 'info' && payload && typeof payload === 'object' && payload.perfMetric === true)
}

function resolveLogType(log) {
  const message = String(log?.args?.[0] || '')
  if (message === '浏览器运行时异常' || message === '未处理的异步异常') return 'runtime_error'
  if (message.includes('接口') || message.includes('请求')) return 'request'
  if (message.includes('路由')) return 'route'
  if (message === '用户操作') return 'action'
  return 'app'
}

function resolveEventName(log) {
  const payload = log?.args?.[1]
  if (payload && typeof payload === 'object' && payload.action) {
    return String(payload.action)
  }
  return resolveLogType(log)
}

function toDetailJson(log) {
  const details = Array.isArray(log?.args) ? log.args.slice(1) : []
  if (details.length === 0) return ''
  try {
    return JSON.stringify(details.length === 1 ? details[0] : details)
  } catch (error) {
    return JSON.stringify({ message: 'detail_stringify_failed' })
  }
}

function normalizeReportItem(log) {
  const detailPayload = log?.args?.[1]
  const traceId =
    (detailPayload && typeof detailPayload === 'object' && detailPayload.traceId) || getLatestTraceId() || createTraceId()
  return {
    time: log.time || new Date().toISOString(),
    level: String(log.level || 'warn').toLowerCase(),
    type: resolveLogType(log),
    eventName: resolveEventName(log),
    message: String(log?.args?.[0] || '未知前端日志'),
    pagePath: getCurrentPath(),
    traceId,
    detailJson: toDetailJson(log)
  }
}

function enqueueLog(log) {
  if (!shouldReport(log)) return
  pendingQueue.push(normalizeReportItem(log))
  const limit = Math.max(20, Number(appConfig.frontendMonitorQueueSize || 100))
  if (pendingQueue.length > limit) {
    pendingQueue = pendingQueue.slice(-limit)
  }
}

async function sendBatch(logs, keepalive = false) {
  const headers = {
    'Content-Type': 'application/json',
    [TRACE_ID_HEADER]: createTraceId()
  }
  const csrfToken = readCsrfToken()
  if (csrfToken) {
    headers[appConfig.csrfHeaderName] = csrfToken
  }

  const response = await fetchWithRuntime(`${appConfig.apiBaseUrl}${REPORT_ENDPOINT}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ logs }),
    keepalive,
    credentials: 'same-origin'
  })
  return response.ok
}

export async function flushFrontendMonitorLogs(options = {}) {
  if (!appConfig.frontendMonitorEnabled || sending || pendingQueue.length === 0 || !hasWindow()) {
    return false
  }
  sending = true
  const batchSize = Math.max(1, Number(appConfig.frontendMonitorBatchSize || 20))
  const logs = pendingQueue.slice(0, batchSize)
  try {
    const ok = await sendBatch(logs, Boolean(options.keepalive))
    if (ok) {
      pendingQueue = pendingQueue.slice(logs.length)
    }
    return ok
  } catch (error) {
    return false
  } finally {
    sending = false
  }
}

function handleRuntimeLogEvent(event) {
  enqueueLog(event?.detail)
  if (pendingQueue.length >= Math.max(5, Number(appConfig.frontendMonitorBatchSize || 20))) {
    void flushFrontendMonitorLogs()
  }
}

function handleVisibilityChange() {
  const doc = getDocumentObject()
  if (doc?.visibilityState === 'hidden') {
    void flushFrontendMonitorLogs({ keepalive: true })
  }
}

function handlePageHide() {
  void flushFrontendMonitorLogs({ keepalive: true })
}

function installPageLifecycleHooks() {
  addDocumentEventListener('visibilitychange', handleVisibilityChange)
  addWindowEventListener('pagehide', handlePageHide)
}

export function installFrontendMonitor() {
  if (installed || !hasWindow()) return
  installed = true
  addWindowEventListener(RUNTIME_LOG_EVENT, handleRuntimeLogEvent)
  installPageLifecycleHooks()
  const intervalMs = Math.max(3000, Number(appConfig.frontendMonitorFlushIntervalMs || 10000))
  flushTimer = setRuntimeInterval(() => {
    void flushFrontendMonitorLogs()
  }, intervalMs)
}

export function getFrontendMonitorQueueSize() {
  return pendingQueue.length
}

export function resetFrontendMonitorForTest() {
  if (hasWindow()) {
    removeWindowEventListener(RUNTIME_LOG_EVENT, handleRuntimeLogEvent)
    removeDocumentEventListener('visibilitychange', handleVisibilityChange)
    removeWindowEventListener('pagehide', handlePageHide)
    clearRuntimeInterval(flushTimer)
    flushTimer = null
  }
  pendingQueue = []
  sending = false
  installed = false
}
