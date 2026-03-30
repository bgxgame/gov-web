import { appConfig } from '../config/app-config'
import { getLatestTraceId } from './trace'

const LEVEL_MAP = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
}

const SENSITIVE_KEYS = ['password', 'token', 'authorization', 'phone', 'secret', 'key']
const RUNTIME_LOG_KEY = '__gov_runtime_logs__'
let runtimeObserversInstalled = false
const RUNTIME_LOG_EVENT = '__gov_runtime_log__'
let bufferedRuntimeLogs = null
let runtimeLogsFlushTimer = null

function resolveCurrentLevel() {
  const configured = appConfig.logLevel
  return LEVEL_MAP[configured] ? configured : 'warn'
}

function shouldLog(level) {
  return LEVEL_MAP[level] >= LEVEL_MAP[resolveCurrentLevel()]
}

function maskText(value) {
  const text = String(value)
  if (text.length <= 4) return '****'
  return `${text.slice(0, 2)}****${text.slice(-2)}`
}

function sanitizeValue(value, depth = 0) {
  if (value === null || value === undefined) return value
  if (depth > 3) return '[MaxDepth]'
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, depth + 1))
  }
  if (typeof value === 'object') {
    return Object.keys(value).reduce((result, key) => {
      const lowerKey = key.toLowerCase()
      if (SENSITIVE_KEYS.some((sensitive) => lowerKey.includes(sensitive))) {
        result[key] = maskText(value[key])
      } else {
        result[key] = sanitizeValue(value[key], depth + 1)
      }
      return result
    }, {})
  }
  return value
}

function readBufferedLogs() {
  if (bufferedRuntimeLogs) return bufferedRuntimeLogs
  if (typeof window === 'undefined') return []
  try {
    const raw = window.sessionStorage?.getItem(RUNTIME_LOG_KEY)
    if (!raw) {
      bufferedRuntimeLogs = []
      return bufferedRuntimeLogs
    }
    const parsed = JSON.parse(raw)
    bufferedRuntimeLogs = Array.isArray(parsed) ? parsed : []
    return bufferedRuntimeLogs
  } catch (error) {
    bufferedRuntimeLogs = []
    return bufferedRuntimeLogs
  }
}

function persistRuntimeLogsSoon() {
  if (typeof window === 'undefined' || runtimeLogsFlushTimer) return
  const flush = () => {
    runtimeLogsFlushTimer = null
    if (typeof window === 'undefined') return
    const normalizedLogs = Array.isArray(bufferedRuntimeLogs) ? bufferedRuntimeLogs : []
    try {
      if (window.sessionStorage) {
        window.sessionStorage.setItem(RUNTIME_LOG_KEY, JSON.stringify(normalizedLogs))
      }
    } catch (error) {
      // 会话存储不可用时静默忽略，仅保留控制台输出。
    }
    window.__GOV_APP_LOGS__ = normalizedLogs
  }
  if (typeof window.requestIdleCallback === 'function') {
    runtimeLogsFlushTimer = window.requestIdleCallback(flush, { timeout: 500 })
    return
  }
  runtimeLogsFlushTimer = window.setTimeout(flush, 120)
}

function writeBufferedLogs(logs) {
  if (typeof window === 'undefined') return
  bufferedRuntimeLogs = Array.isArray(logs) ? logs : []
  window.__GOV_APP_LOGS__ = bufferedRuntimeLogs
  persistRuntimeLogsSoon()
}

function appendRuntimeLogSanitized(level, sanitizedArgs) {
  if (typeof window === 'undefined') return
  const nextLog = {
    time: new Date().toISOString(),
    level,
    args: Array.isArray(sanitizedArgs) ? sanitizedArgs : []
  }
  const limit = Math.max(20, Number(appConfig.runtimeLogBufferSize || 200))
  const logs = readBufferedLogs().slice()
  logs.push(nextLog)
  writeBufferedLogs(logs.slice(-limit))
  try {
    window.dispatchEvent(new CustomEvent(RUNTIME_LOG_EVENT, { detail: nextLog }))
  } catch (error) {
    // 运行时日志事件派发失败时，不影响主业务链路。
  }
}

function print(level, args) {
  const sanitizedArgs = args.map((item) => sanitizeValue(item))
  appendRuntimeLogSanitized(level, sanitizedArgs)
  if (!shouldLog(level)) return
  const fn = console[level] || console.log
  fn(`[${appConfig.appName}]`, ...sanitizedArgs)
}

export const logger = {
  debug(...args) {
    print('debug', args)
  },
  info(...args) {
    print('info', args)
  },
  warn(...args) {
    print('warn', args)
  },
  error(...args) {
    print('error', args)
  }
}

/**
 * 记录用户关键动作，便于和 traceId、后端性能日志、审计日志联动回放。
 *
 * @param {string} action 动作名称
 * @param {Record<string, unknown>} payload 动作附带信息
 * @param {'debug'|'info'|'warn'|'error'} level 日志级别
 */
export function logUserAction(action, payload = {}, level = 'info') {
  const normalizedLevel = LEVEL_MAP[level] ? level : 'info'
  logger[normalizedLevel]('用户操作', {
    action: String(action || 'unknown'),
    ...payload
  })
}

function resolveErrorPayload(eventOrReason) {
  const message = eventOrReason?.message || eventOrReason?.reason?.message || eventOrReason?.reason || '未知运行时异常'
  const source = eventOrReason?.filename || eventOrReason?.target?.location?.href || ''
  const line = eventOrReason?.lineno || eventOrReason?.line || ''
  const column = eventOrReason?.colno || eventOrReason?.column || ''
  const stack = eventOrReason?.error?.stack || eventOrReason?.reason?.stack || ''

  return {
    message: String(message),
    source: source || undefined,
    line: line || undefined,
    column: column || undefined,
    stack: stack || undefined,
    traceId: getLatestTraceId() || undefined
  }
}

/**
 * 安装浏览器全局运行时异常监听，将未捕获错误与未处理 Promise 拒绝写入统一日志缓冲。
 */
export function installRuntimeErrorObservers() {
  if (typeof window === 'undefined' || runtimeObserversInstalled) return
  runtimeObserversInstalled = true

  window.addEventListener('error', (event) => {
    logger.error('浏览器运行时异常', resolveErrorPayload(event))
  })

  window.addEventListener('unhandledrejection', (event) => {
    logger.error('未处理的异步异常', resolveErrorPayload(event))
  })
}

if (typeof window !== 'undefined' && !window.__GOV_APP_LOGS__) {
  writeBufferedLogs(readBufferedLogs())
}

export { RUNTIME_LOG_EVENT }
