import axios from 'axios'
import { appConfig } from '../config/app-config'
import { clearAuthStorage, readCsrfToken } from './browser-storage'
import { getLocationObject, replaceLocation, setRuntimeTimeout } from './browser-runtime'
import { getErrorMessage, showError } from './feedback'
import { logger } from './logger'
import { ensureTraceId, setLatestTraceId, TRACE_ID_HEADER } from './trace'

const service = axios.create({
  baseURL: appConfig.apiBaseUrl,
  timeout: appConfig.requestTimeout,
  withCredentials: true
})

let redirectedBy401 = false
const pendingRequestControllers = new Map()

const RETRYABLE_CODES = new Set(['ECONNABORTED', 'ERR_NETWORK', 'ERR_CANCELED'])
const MAX_RETRY = 2
const RETRY_DELAY_MS = 800
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])
const FRONTEND_MONITOR_REPORT_PATH = '/system/frontend-monitor/report'

function shouldSilenceErrorMessage(config) {
  return Boolean(config?.silentError)
}

function resolveCancelKey(config) {
  const raw = String(config?.cancelKey || '').trim()
  return raw || ''
}

function normalizeUrlPath(url) {
  if (!url) return ''
  const raw = String(url).trim()
  if (!raw) return ''
  const withoutQuery = raw.split('?')[0] || ''
  if (!withoutQuery) return ''
  try {
    if (withoutQuery.startsWith('http://') || withoutQuery.startsWith('https://')) {
      const parsed = new URL(withoutQuery)
      return parsed.pathname || ''
    }
  } catch (error) {
    return withoutQuery
  }
  return withoutQuery
}

function isFrontendMonitorReportRequest(config) {
  const path = normalizeUrlPath(config?.url)
  return path.endsWith(FRONTEND_MONITOR_REPORT_PATH)
}

function cleanupPendingRequest(config) {
  const cancelKey = resolveCancelKey(config)
  const controller = config?.metadata?._cancelController
  if (!cancelKey || !controller) return
  if (pendingRequestControllers.get(cancelKey) === controller) {
    pendingRequestControllers.delete(cancelKey)
  }
}

function isCanceledRequest(error) {
  return axios.isCancel(error) || error?.code === 'ERR_CANCELED'
}

function isRetryable(error) {
  if (isCanceledRequest(error)) return false
  if (error?.config?.method && error.config.method.toUpperCase() !== 'GET') return false
  const status = error?.response?.status
  if (status && status < 500) return false
  return RETRYABLE_CODES.has(error?.code) || !error?.response
}

function shouldAttachCsrfHeader(config) {
  const method = String(config?.method || 'GET').toUpperCase()
  return !SAFE_METHODS.has(method)
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

service.interceptors.request.use(
  (config) => {
    const traceId = ensureTraceId(config)
    const headers = config.headers || {}
    const cancelKey = resolveCancelKey(config)

    headers[TRACE_ID_HEADER] = traceId
    if (shouldAttachCsrfHeader(config)) {
      const csrfToken = readCsrfToken()
      if (csrfToken) {
        headers[appConfig.csrfHeaderName] = csrfToken
      }
    }

    config.headers = headers
    config.metadata = {
      ...(config.metadata || {}),
      startAt: Date.now(),
      traceId,
      cancelKey,
      retryCount: config.metadata?.retryCount || 0
    }

    if (cancelKey) {
      const previousController = pendingRequestControllers.get(cancelKey)
      if (previousController) {
        previousController.abort('request_replaced')
      }
      const controller = new AbortController()
      pendingRequestControllers.set(cancelKey, controller)
      config.signal = controller.signal
      config.metadata._cancelController = controller
    }

    return config
  },
  (error) => Promise.reject(error)
)

service.interceptors.response.use(
  (response) => {
    cleanupPendingRequest(response.config)

    const res = response.data
    const requestUrl = response.config?.url
    const durationMs = Date.now() - Number(response.config?.metadata?.startAt || Date.now())
    const traceId = response.headers?.['x-trace-id'] || response.config?.metadata?.traceId || ''
    setLatestTraceId(traceId)

    if (res.code !== 200) {
      logger.warn('接口业务失败', { url: requestUrl, code: res.code, msg: res.msg, durationMs, traceId })
      let messageHandled = false
      if (res.code === 401) {
        if (isFrontendMonitorReportRequest(response.config)) {
          messageHandled = true
        } else {
          clearAuthStorage()
          if (!redirectedBy401) {
            redirectedBy401 = true
            showError(res.msg || '登录已失效，请重新登录')
            messageHandled = true
            if (getLocationObject()?.pathname !== '/login') {
              replaceLocation('/login')
            }
            setRuntimeTimeout(() => {
              redirectedBy401 = false
            }, 800)
          }
        }
      } else if (!shouldSilenceErrorMessage(response.config)) {
        showError(res.msg || '系统错误')
        messageHandled = true
      }

      const apiError = new Error(getErrorMessage({ response: { data: res } }))
      apiError.code = res.code
      apiError.msg = res.msg
      apiError.traceId = traceId
      apiError.__messageHandled = messageHandled
      return Promise.reject(apiError)
    }

    if (durationMs >= appConfig.slowRequestThreshold) {
      logger.warn('检测到慢请求', { url: requestUrl, durationMs, traceId })
    } else {
      logger.debug('接口请求成功', { url: requestUrl, durationMs, traceId })
    }
    return res
  },
  async (error) => {
    cleanupPendingRequest(error?.config)

    const requestUrl = error?.config?.url
    const durationMs = Date.now() - Number(error?.config?.metadata?.startAt || Date.now())
    const traceId = error?.response?.headers?.['x-trace-id'] || error?.config?.metadata?.traceId || ''
    const cancelKey = error?.config?.metadata?.cancelKey || resolveCancelKey(error?.config)
    setLatestTraceId(traceId)

    if (isCanceledRequest(error)) {
      logger.debug('重复请求已取消', { url: requestUrl, cancelKey, traceId })
      error.__cancelled = true
      error.__messageHandled = true
      error.traceId = traceId
      return Promise.reject(error)
    }

    const retryCount = error?.config?.metadata?.retryCount || 0
    if (isRetryable(error) && retryCount < MAX_RETRY) {
      logger.warn('接口请求失败，准备重试', { url: requestUrl, retryCount: retryCount + 1, maxRetry: MAX_RETRY, traceId })
      await sleep(RETRY_DELAY_MS * (retryCount + 1))
      const retryConfig = {
        ...error.config,
        metadata: {
          ...(error.config?.metadata || {}),
          retryCount: retryCount + 1,
          startAt: Date.now()
        }
      }
      return service(retryConfig)
    }

    logger.error('接口请求异常', {
      url: requestUrl,
      message: error?.message,
      durationMs,
      status: error?.response?.status,
      traceId
    })

    if (!error?.__messageHandled && !shouldSilenceErrorMessage(error?.config)) {
      showError(getErrorMessage(error, '网络请求失败'))
      error.__messageHandled = true
    }
    error.traceId = traceId
    return Promise.reject(error)
  }
)

export default service
