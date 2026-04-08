import { appConfig } from '../config/app-config'
import { readJsonFromSessionStorage, writeJsonToSessionStorage } from './browser-storage'
import {
  addWindowEventListener,
  dispatchWindowEvent,
  getRuntimeGlobal,
  hasWindow,
  requestIdleRuntimeCallback,
  setRuntimeGlobal,
  setRuntimeTimeout
} from './browser-runtime'
import { getLatestTraceId } from './trace'

const LEVEL_MAP = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
}

const SENSITIVE_KEYS = ['password', 'token', 'authorization', 'phone', 'secret', 'key']
const RUNTIME_LOG_KEY = '__gov_runtime_logs__'
const RUNTIME_LOG_EVENT = '__gov_runtime_log__'

let runtimeObserversInstalled = false
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
  if (!hasWindow()) return []
  const parsed = readJsonFromSessionStorage(RUNTIME_LOG_KEY)
  bufferedRuntimeLogs = Array.isArray(parsed) ? parsed : []
  return bufferedRuntimeLogs
}

function persistRuntimeLogsSoon() {
  if (!hasWindow() || runtimeLogsFlushTimer) return
  const flush = () => {
    runtimeLogsFlushTimer = null
    if (!hasWindow()) return
    const normalizedLogs = Array.isArray(bufferedRuntimeLogs) ? bufferedRuntimeLogs : []
    writeJsonToSessionStorage(RUNTIME_LOG_KEY, normalizedLogs)
    setRuntimeGlobal('__GOV_APP_LOGS__', normalizedLogs)
  }
  runtimeLogsFlushTimer = requestIdleRuntimeCallback(flush, { timeout: 500 }) || setRuntimeTimeout(flush, 120)
}

function writeBufferedLogs(logs) {
  if (!hasWindow()) return
  bufferedRuntimeLogs = Array.isArray(logs) ? logs : []
  setRuntimeGlobal('__GOV_APP_LOGS__', bufferedRuntimeLogs)
  persistRuntimeLogsSoon()
}

function appendRuntimeLogSanitized(level, sanitizedArgs) {
  if (!hasWindow()) return
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
    dispatchWindowEvent(new CustomEvent(RUNTIME_LOG_EVENT, { detail: nextLog }))
  } catch (error) {
    // Ignore event dispatch failures and keep the app running.
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

export function installRuntimeErrorObservers() {
  if (!hasWindow() || runtimeObserversInstalled) return
  runtimeObserversInstalled = true

  addWindowEventListener('error', (event) => {
    logger.error('浏览器运行时异常', resolveErrorPayload(event))
  })

  addWindowEventListener('unhandledrejection', (event) => {
    logger.error('未处理的异步异常', resolveErrorPayload(event))
  })
}

if (hasWindow() && !getRuntimeGlobal('__GOV_APP_LOGS__')) {
  writeBufferedLogs(readBufferedLogs())
}

export { RUNTIME_LOG_EVENT }
