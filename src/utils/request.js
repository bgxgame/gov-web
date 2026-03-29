import axios from 'axios'
import { appConfig } from '../config/app-config'
import { getErrorMessage, showError } from './feedback'
import { logger } from './logger'

/**
 * 职责：
 * 提供全局统一的 Axios 实例。
 *
 * 为什么存在：
 * 把 token 注入、`R(code, msg, data)` 解析、401 处理和中文错误提示收敛到一处，
 * 避免每个页面重复写网络兜底逻辑。
 *
 * 关键输入输出：
 * 输入是页面和 api 层发起的 HTTP 请求；
 * 输出是统一解析后的业务响应，或已经翻译成中文的错误对象。
 *
 * 关联链路：
 * api -> request -> 后端接口 -> 中文错误提示 / 登录失效跳转。
 */
const service = axios.create({
  baseURL: appConfig.apiBaseUrl,
  timeout: appConfig.requestTimeout
})

let redirectedBy401 = false

/**
 * 作用：
 * 在请求发出前自动附带 Authorization 头。
 */
service.interceptors.request.use(
  (config) => {
    config.metadata = {
      startAt: Date.now()
    }
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = token
    }
    return config
  },
  (error) => Promise.reject(error)
)

/**
 * 作用：
 * 统一处理后端 `R` 响应结构和网络异常。
 *
 * 为什么这样做：
 * 让页面层只关心业务成功分支，失败分支的中文提示和登录态兜底都集中在这里完成。
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
