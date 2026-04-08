import { getRuntimeAppConfig } from '../utils/browser-runtime'

function parseMenuKeyList(rawValue) {
  return [...new Set(
    String(rawValue || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  )]
}

const runtimeEnv = getRuntimeAppConfig()

function readEnvValue(key, fallbackValue = '') {
  const runtimeValue = runtimeEnv[key]
  if (runtimeValue !== undefined && runtimeValue !== null && String(runtimeValue).trim() !== '') {
    return runtimeValue
  }
  const buildValue = import.meta.env[key]
  if (buildValue !== undefined && buildValue !== null && String(buildValue).trim() !== '') {
    return buildValue
  }
  return fallbackValue
}

function readNumberValue(key, fallbackValue) {
  const parsed = Number(readEnvValue(key, fallbackValue))
  return Number.isFinite(parsed) ? parsed : fallbackValue
}

function readBooleanValue(key, fallbackValue) {
  const value = String(readEnvValue(key, fallbackValue ? 'true' : 'false')).toLowerCase()
  return value === 'true'
}

const slowRequestThreshold = readNumberValue('VITE_APP_SLOW_REQUEST_MS', 800)
const slowRouteThreshold = readNumberValue('VITE_APP_SLOW_ROUTE_MS', 800)
const slowInitialRouteThreshold = readNumberValue(
  'VITE_APP_SLOW_INITIAL_ROUTE_MS',
  import.meta.env.DEV ? Math.max(1600, slowRouteThreshold * 2) : Math.max(1200, slowRouteThreshold + 400)
)

/**
 * 统一管理前端运行时配置。
 * 优先读取服务器启动时生成的 env.js，其次回退到 Vite 构建时环境变量，
 * 这样既兼容本地开发，又支持服务器部署后按需调整配置而不必重新打包。
 */
export const appConfig = {
  appName: readEnvValue('VITE_APP_NAME', '项管平台'),
  apiBaseUrl: readEnvValue('VITE_API_BASE_URL', '/api'),
  requestTimeout: readNumberValue('VITE_API_TIMEOUT', 10000),
  logLevel: String(readEnvValue('VITE_APP_LOG_LEVEL', 'warn')).toLowerCase(),
  slowRequestThreshold,
  slowRouteThreshold,
  slowInitialRouteThreshold,
  runtimeLogBufferSize: readNumberValue('VITE_APP_RUNTIME_LOG_BUFFER_SIZE', 200),
  frontendMonitorEnabled: readBooleanValue('VITE_APP_FRONTEND_MONITOR_ENABLED', true),
  frontendMonitorFlushIntervalMs: readNumberValue('VITE_APP_FRONTEND_MONITOR_FLUSH_MS', 10000),
  frontendMonitorBatchSize: readNumberValue('VITE_APP_FRONTEND_MONITOR_BATCH_SIZE', 20),
  frontendMonitorQueueSize: readNumberValue('VITE_APP_FRONTEND_MONITOR_QUEUE_SIZE', 100),
  fileLogEnabled: readBooleanValue('VITE_APP_ENABLE_FILE_LOG', false),
  logDir: readEnvValue('VITE_APP_LOG_DIR', 'logs'),
  hiddenMenuKeys: parseMenuKeyList(readEnvValue('VITE_APP_HIDDEN_MENUS', ''))
}
