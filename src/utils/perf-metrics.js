import { appConfig } from '../config/app-config'
import { logUserAction, logger } from './logger'

export function nowMs() {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now()
  }
  return Date.now()
}

export function resolveDurationMs(startAt) {
  return Math.max(0, Math.round(nowMs() - Number(startAt || 0)))
}

/**
 * 记录统一性能埋点事件，并自动按阈值升级为告警日志，便于前端监控统一检索。
 */
export function reportPerfAction(action, payload = {}, options = {}) {
  const durationMs = Number(payload.durationMs || 0)
  const thresholdMs = Number(options.thresholdMs || appConfig.slowRequestThreshold || 800)
  const isSlow = durationMs >= thresholdMs
  const level = isSlow ? 'warn' : (options.normalLevel || 'info')
  const eventPayload = {
    perfMetric: true,
    thresholdMs,
    isSlow,
    ...payload
  }

  if (typeof logUserAction === 'function') {
    logUserAction(action, eventPayload, level)
  } else {
    const logFn = typeof logger[level] === 'function' ? logger[level] : logger.info || logger.log
    if (typeof logFn === 'function') {
      logFn('performance_metric', {
        action: String(action || 'unknown'),
        ...eventPayload
      })
    }
  }
  return { isSlow, thresholdMs, level }
}

/**
 * 从起始时间自动计算耗时并上报性能埋点。
 */
export function reportPerfDuration(action, startAt, payload = {}, options = {}) {
  return reportPerfAction(action, {
    ...payload,
    durationMs: resolveDurationMs(startAt)
  }, options)
}
