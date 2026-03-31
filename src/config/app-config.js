function parseMenuKeyList(rawValue) {
  return [...new Set(
    String(rawValue || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  )]
}

const slowRequestThreshold = Number(import.meta.env.VITE_APP_SLOW_REQUEST_MS || 800)
const slowRouteThreshold = Number(import.meta.env.VITE_APP_SLOW_ROUTE_MS || 800)
const slowInitialRouteThreshold = Number(
  import.meta.env.VITE_APP_SLOW_INITIAL_ROUTE_MS ||
    (import.meta.env.DEV ? Math.max(1600, slowRouteThreshold * 2) : Math.max(1200, slowRouteThreshold + 400))
)

/**
 * 统一管理前端运行时配置。
 * 存在原因：避免页面和工具层散落读取环境变量，方便后续统一收口与排查。
 * 输入输出：输入为 Vite 环境变量，输出为前端统一配置对象。
 * 关联链路：request、logger、route-progress、监控、菜单开关与构建脚本。
 */
export const appConfig = {
  appName: import.meta.env.VITE_APP_NAME || 'gov-web',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
  requestTimeout: Number(import.meta.env.VITE_API_TIMEOUT || 10000),
  logLevel: String(import.meta.env.VITE_APP_LOG_LEVEL || 'warn').toLowerCase(),
  slowRequestThreshold,
  slowRouteThreshold,
  slowInitialRouteThreshold,
  runtimeLogBufferSize: Number(import.meta.env.VITE_APP_RUNTIME_LOG_BUFFER_SIZE || 200),
  frontendMonitorEnabled: String(import.meta.env.VITE_APP_FRONTEND_MONITOR_ENABLED || 'true').toLowerCase() === 'true',
  frontendMonitorFlushIntervalMs: Number(import.meta.env.VITE_APP_FRONTEND_MONITOR_FLUSH_MS || 10000),
  frontendMonitorBatchSize: Number(import.meta.env.VITE_APP_FRONTEND_MONITOR_BATCH_SIZE || 20),
  frontendMonitorQueueSize: Number(import.meta.env.VITE_APP_FRONTEND_MONITOR_QUEUE_SIZE || 100),
  fileLogEnabled: String(import.meta.env.VITE_APP_ENABLE_FILE_LOG || 'false').toLowerCase() === 'true',
  logDir: import.meta.env.VITE_APP_LOG_DIR || 'logs',
  hiddenMenuKeys: parseMenuKeyList(import.meta.env.VITE_APP_HIDDEN_MENUS)
}
