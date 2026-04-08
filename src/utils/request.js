import axios from 'axios'
import { appConfig } from '../config/app-config'
import { clearAuthStorage, readToken } from './browser-storage'
import { getLocationObject, replaceLocation, setRuntimeTimeout } from './browser-runtime'
import { getErrorMessage, showError } from './feedback'
import { logger } from './logger'
import { ensureTraceId, setLatestTraceId, TRACE_ID_HEADER } from './trace'

/**
 * 提供统一的 Axios 实例，集中处理鉴权、慢请求观测、统一响应解析和错误提示。
 * 存在原因：避免页面层散落处理 token、traceId、401 与 `R(code,msg,data)` 结构。
 * 输入输出：输入为页面发起的 HTTP 请求，输出为解析后的业务数据或带 traceId 的错误对象。
 * 关联链路：api 层 -> request -> 后端接口 -> 统一反馈与日志。
 */
const service = axios.create({
  baseURL: appConfig.apiBaseUrl,
  timeout: appConfig.requestTimeout
})

let redirectedBy401 = false
const pendingRequestControllers = new Map()

// 需要重试的网络错误码
const RETRYABLE_CODES = new Set(['ECONNABORTED', 'ERR_NETWORK', 'ERR_CANCELED'])
const MAX_RETRY = 2
const RETRY_DELAY_MS = 800

function shouldSilenceErrorMessage(config) {
  return Boolean(config?.silentError)
}

function resolveCancelKey(config) {
  const raw = String(config?.cancelKey || '').trim()
  return raw || ''
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 在请求发出前补齐 token、traceId，并在需要时取消同类旧请求。
 * 存在原因：快速查询、切页、切 tab 时，如果旧请求继续占用网络和主线程，会放大卡顿感。
 */
service.interceptors.request.use(
  (config) => {
    const traceId = ensureTraceId(config)
    const token = readToken()
    const headers = config.headers || {}
    const cancelKey = resolveCancelKey(config)

    headers[TRACE_ID_HEADER] = traceId
    if (token) {
      headers.Authorization = token
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

/**
 * 统一解析后端 `R` 包装结构，并记录慢请求、业务失败和网络异常。
 * 网络错误（无响应、超时）对 GET 接口自动重试最多 2 次，重试间隔 800ms。
 */
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

    // GET 接口网络错误自动重试
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
