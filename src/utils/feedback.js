import { ElMessage, ElMessageBox } from 'element-plus'

/**
 * 职责：
 * 提供统一的中文提示、错误翻译和确认框封装。
 *
 * 为什么存在：
 * 避免每个页面各写一套 `ElMessage / ElMessageBox` 文案和错误映射，
 * 让前端提示风格保持稳定、可维护。
 *
 * 关键输入输出：
 * 输入是接口错误、业务提示和确认框参数；
 * 输出是统一的中文消息提示或确认框 Promise。
 *
 * 关联链路：
 * request 拦截器 -> 中文错误提示；页面操作 -> 成功/警告/确认反馈。
 */
const MESSAGE_MAP = {
  Error: '系统繁忙，请稍后重试',
  'Network Error': '网络连接失败，请检查网络后重试',
  timeout: '请求超时，请稍后重试',
  'Request failed with status code 400': '请求参数有误，请检查后重试',
  'Request failed with status code 401': '登录已失效，请重新登录',
  'Request failed with status code 403': '抱歉，您没有权限执行该操作',
  'Request failed with status code 404': '请求的接口不存在',
  'Request failed with status code 500': '服务器开小差了，请稍后重试'
}

/**
 * 作用：
 * 规范化提示文案，优先翻译常见英文错误，再回退到原始文案或兜底文案。
 */
function normalizeMessage(message, fallback) {
  const text = String(message ?? '').trim()
  if (!text) {
    return fallback
  }
  if (MESSAGE_MAP[text]) {
    return MESSAGE_MAP[text]
  }
  if (/timeout/i.test(text)) {
    return MESSAGE_MAP.timeout
  }
  if (/Network Error/i.test(text)) {
    return MESSAGE_MAP['Network Error']
  }
  return text
}

/**
 * 作用：
 * 从异常对象中提取更适合直接展示给用户的中文错误信息。
 */
export function getErrorMessage(error, fallback = '系统繁忙，请稍后重试') {
  const responseMessage = error?.response?.data?.msg
  const directMessage = error?.msg || error?.message
  return normalizeMessage(responseMessage || directMessage, fallback)
}

/**
 * 作用：
 * 弹出统一成功提示。
 */
export function showSuccess(message = '操作成功') {
  ElMessage.success(normalizeMessage(message, '操作成功'))
}

/**
 * 作用：
 * 弹出统一警告提示。
 */
export function showWarning(message = '请检查后重试') {
  ElMessage.warning(normalizeMessage(message, '请检查后重试'))
}

/**
 * 作用：
 * 弹出统一错误提示。
 */
export function showError(message = '系统繁忙，请稍后重试') {
  ElMessage.error(normalizeMessage(message, '系统繁忙，请稍后重试'))
}

/**
 * 作用：
 * 弹出统一确认框。
 *
 * 输出 / 副作用：
 * 返回 Element Plus 的确认 Promise，页面可继续串联确认后的业务操作。
 */
export async function confirmAction(message, options = {}) {
  const {
    title = '操作确认',
    type = 'warning',
    confirmButtonText = '确定',
    cancelButtonText = '取消'
  } = options

  return ElMessageBox.confirm(normalizeMessage(message, '请确认是否继续操作'), title, {
    type,
    confirmButtonText,
    cancelButtonText
  })
}
