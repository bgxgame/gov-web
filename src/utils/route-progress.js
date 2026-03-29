import { logger } from './logger'

const PROGRESS_BAR_ID = 'route-progress-bar'
let activeToken = 0
let progressTimer = null
let startedAt = 0

/**
 * 职责：为路由切换提供轻量级顶部进度条反馈。
 * 为什么存在：菜单点击后的异步路由加载阶段容易被误解为“没反应”，需要即时反馈。
 * 关键输入输出：输入为路由跳转开始/结束事件，输出为顶部加载进度条动画与耗时日志。
 * 关联链路：侧边菜单点击、路由守卫、页面懒加载。
 */
export function startRouteProgress() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return 0
  activeToken += 1
  const currentToken = activeToken
  startedAt = Date.now()
  const bar = ensureProgressBar()
  bar.style.opacity = '1'
  setProgress(bar, 18)

  clearInterval(progressTimer)
  progressTimer = window.setInterval(() => {
    const current = Number(bar.dataset.progress || 18)
    const next = Math.min(86, current + Math.max(1, (86 - current) * 0.08))
    setProgress(bar, next)
  }, 120)
  return currentToken
}

export function finishRouteProgress(token, options = {}) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return
  if (!token || token !== activeToken) return
  const { hasError = false } = options
  const bar = ensureProgressBar()

  clearInterval(progressTimer)
  progressTimer = null
  setProgress(bar, 100)
  window.setTimeout(() => {
    bar.style.opacity = '0'
    setProgress(bar, 0)
  }, 220)

  const durationMs = Date.now() - startedAt
  if (durationMs > 800) {
    logger.warn('页面路由加载耗时偏高', { durationMs, hasError })
  } else {
    logger.debug('页面路由加载完成', { durationMs, hasError })
  }
}

function ensureProgressBar() {
  let bar = document.getElementById(PROGRESS_BAR_ID)
  if (bar) return bar

  bar = document.createElement('div')
  bar.id = PROGRESS_BAR_ID
  bar.style.position = 'fixed'
  bar.style.top = '0'
  bar.style.left = '0'
  bar.style.width = '100%'
  bar.style.height = '2px'
  bar.style.zIndex = '4000'
  bar.style.pointerEvents = 'none'
  bar.style.opacity = '0'
  bar.style.transition = 'opacity 0.2s ease'
  const inner = document.createElement('div')
  inner.style.height = '100%'
  inner.style.width = '0%'
  inner.style.background = 'linear-gradient(90deg, #2f89ff 0%, #36cfc9 100%)'
  inner.style.boxShadow = '0 0 8px rgba(47, 137, 255, 0.45)'
  inner.style.transition = 'width 0.18s ease'
  inner.className = 'route-progress-inner'
  bar.appendChild(inner)
  document.body.appendChild(bar)
  return bar
}

function setProgress(bar, value) {
  if (!bar) return
  const progress = Math.max(0, Math.min(100, Number(value || 0)))
  bar.dataset.progress = String(progress)
  const inner = bar.querySelector('.route-progress-inner')
  if (inner) {
    inner.style.width = `${progress}%`
  }
}
