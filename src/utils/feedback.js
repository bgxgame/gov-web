import { ElMessage, ElMessageBox } from 'element-plus'

/**
 * 职责：提供统一的成功/警告/错误提示与确认弹窗。
 * 为什么存在：收敛页面零散提示逻辑，统一中文文案、交互行为和弹层显示质量。
 * 关键输入输出：输入为错误对象或文案，输出为统一提示组件行为。
 * 关联链路：request 拦截器、各业务页面操作反馈。
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

const MESSAGE_OPTIONS = {
  showClose: true,
  grouping: true,
  offset: 20
}

const MESSAGE_PRESETS = {
  success: {
    duration: 2200,
    customClass: 'app-message app-message--success'
  },
  warning: {
    duration: 3200,
    customClass: 'app-message app-message--warning'
  },
  error: {
    duration: 4200,
    customClass: 'app-message app-message--error'
  }
}

function normalizeMessage(message, fallback) {
  const text = String(message ?? '').trim()
  if (!text) return fallback
  if (MESSAGE_MAP[text]) return MESSAGE_MAP[text]
  if (/timeout/i.test(text)) return MESSAGE_MAP.timeout
  if (/Network Error/i.test(text)) return MESSAGE_MAP['Network Error']
  return text
}

/**
 * 作用：从异常对象中提取更适合直接展示给用户的中文错误信息。
 */
export function getErrorMessage(error, fallback = '系统繁忙，请稍后重试') {
  const responseMessage = error?.response?.data?.msg
  const directMessage = error?.msg || error?.message
  return normalizeMessage(responseMessage || directMessage, fallback)
}

function resolveMessageOptions(kind, message, fallback) {
  return {
    ...MESSAGE_OPTIONS,
    ...(MESSAGE_PRESETS[kind] || {}),
    message: normalizeMessage(message, fallback)
  }
}

/**
 * 作用：弹出统一成功提示。
 */
export function showSuccess(message = '操作成功') {
  ElMessage.success(resolveMessageOptions('success', message, '操作成功'))
}

/**
 * 作用：弹出统一警告提示。
 */
export function showWarning(message = '请检查后重试') {
  ElMessage.warning(resolveMessageOptions('warning', message, '请检查后重试'))
}

/**
 * 作用：弹出统一错误提示。
 */
export function showError(message = '系统繁忙，请稍后重试') {
  ElMessage.error(resolveMessageOptions('error', message, '系统繁忙，请稍后重试'))
}

/**
 * 作用：判断当前异常是否属于确认框取消/关闭，不应再提示失败消息。
 */
export function isCancelError(error) {
  const text = String(error?.action || error?.message || error || '').trim().toLowerCase()
  if (!text) return false
  return text === 'cancel' || text === 'close' || text === '取消' || text === '关闭'
}

/**
 * 作用：统一处理页面动作异常；用户取消时静默忽略，其余异常只在未提示过时补兜底提示。
 */
export function handleActionError(error, fallback = '操作失败，请稍后重试') {
  if (isCancelError(error)) return
  if (error?.__messageHandled) return
  showError(getErrorMessage(error, fallback))
}

/**
 * 作用：弹出统一确认框，默认禁用遮罩误触关闭。
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
    cancelButtonText,
    closeOnClickModal: false,
    closeOnPressEscape: false,
    distinguishCancelAndClose: true,
    appendTo: 'body'
  })
}
