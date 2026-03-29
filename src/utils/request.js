import axios from 'axios'
import { appConfig } from '../config/app-config'
import { getErrorMessage, showError } from './feedback'
import { logger } from './logger'

/**
 * 职责：提供全局统一的 Axios 实例。
 * 为什么存在：集中处理 token 注入、统一响应 `R(code,msg,data)` 解析与错误提示。
 * 关键输入输出：输入为页面发起的 HTTP 请求，输出为统一解析后的业务数据或错误对象。
 * 关联链路：api 层 -> request -> 后端接口。
 */
const service = axios.create({
  baseURL: appConfig.apiBaseUrl,
  timeout: appConfig.requestTimeout
})

let redirectedBy401 = false

/**
 * 作用：请求发出前自动附加 Authorization 头，并记录请求起始时间。
 */
service.interceptors.request.use(
  (config) => {
    config.metadata = { startAt: Date.now() }
    const token = localStorage.getItem('token')
    if (token) {
      const headers = config.headers || {}
      headers.Authorization = token
      config.headers = headers
    }
    return config
  },
  (error) => Promise.reject(error)
)

/**
 * 作用：统一处理后端 `R` 结构与网络错误，页面层只保留成功分支逻辑。
 */
service.interceptors.response.use(
  (response) => {
    const res = response.data
    const requestUrl = response.config?.url
    const durationMs = Date.now() - Number(response.config?.metadata?.startAt || Date.now())

    if (res.code !== 200) {
      logger.warn('接口业务失败', { url: requestUrl, code: res.code, msg: res.msg, durationMs })
      if (res.code === 401) {
        localStorage.removeItem('token')
        localStorage.removeItem('user_info')
        if (!redirectedBy401) {
          redirectedBy401 = true
          showError(res.msg || '登录已失效，请重新登录')
          if (window.location.pathname !== '/login') {
            window.location.replace('/login')
          }
          setTimeout(() => {
            redirectedBy401 = false
          }, 800)
        }
      } else {
        showError(res.msg || '系统错误')
      }

      const apiError = new Error(getErrorMessage({ response: { data: res } }))
      apiError.code = res.code
      apiError.msg = res.msg
      apiError.__messageHandled = true
      return Promise.reject(apiError)
    }

    logger.debug('接口请求成功', { url: requestUrl, durationMs })
    return res
  },
  (error) => {
    const requestUrl = error?.config?.url
    const durationMs = Date.now() - Number(error?.config?.metadata?.startAt || Date.now())
    logger.error('接口请求异常', {
      url: requestUrl,
      message: error?.message,
      durationMs,
      status: error?.response?.status
    })

    if (!error?.__messageHandled) {
      showError(getErrorMessage(error, '网络请求失败'))
      error.__messageHandled = true
    }
    return Promise.reject(error)
  }
)

export default service
