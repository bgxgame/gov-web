/**
 * 职责：集中管理前端运行时配置。
 * 为什么存在：避免页面和工具层散落硬编码，方便运维按环境覆盖。
 * 关键输入输出：输入为 Vite 环境变量，输出为统一配置对象。
 * 关联链路：request、logger、构建脚本。
 */
export const appConfig = {
  appName: import.meta.env.VITE_APP_NAME || 'gov-web',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
  requestTimeout: Number(import.meta.env.VITE_API_TIMEOUT || 10000),
  logLevel: String(import.meta.env.VITE_APP_LOG_LEVEL || 'warn').toLowerCase(),
  fileLogEnabled: String(import.meta.env.VITE_APP_ENABLE_FILE_LOG || 'false').toLowerCase() === 'true',
  logDir: import.meta.env.VITE_APP_LOG_DIR || 'logs'
}
