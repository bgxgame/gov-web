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
  duration: 2600,
  offset: 20
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

/**
 * 作用：弹出统一成功提示。
 */
export function showSuccess(message = '操作成功') {
  ElMessage.success({
    ...MESSAGE_OPTIONS,
    message: normalizeMessage(message, '操作成功')
  })
}

/**
 * 作用：弹出统一警告提示。
 */
export function showWarning(message = '请检查后重试') {
  ElMessage.warning({
    ...MESSAGE_OPTIONS,
    message: normalizeMessage(message, '请检查后重试')
  })
}

/**
 * 作用：弹出统一错误提示。
 */
export function showError(message = '系统繁忙，请稍后重试') {
  ElMessage.error({
    ...MESSAGE_OPTIONS,
    message: normalizeMessage(message, '系统繁忙，请稍后重试')
  })
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
