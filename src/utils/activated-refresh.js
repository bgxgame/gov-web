import { onActivated, ref } from 'vue'

/**
 * 职责：
 * 为 keep-alive 页面提供统一的“回到前台后静默刷新”能力。
 *
 * 为什么存在：
 * 页面缓存后切换会更快，但如果完全不刷新，数据容易变旧；这个 helper 用来在性能和新鲜度之间做平衡。
 *
 * 关键输入输出：
 * 输入为页面自定义的刷新函数、最小刷新间隔和当前是否允许刷新；
 * 输出为最近一次成功刷新时间和按需触发的静默刷新行为。
 *
 * 关联链路：
 * keep-alive 页面 -> onActivated -> 轻量静默刷新。
 */
export function useActivatedRefresh(refreshFn, options = {}) {
  const {
    minIntervalMs = 15000,
    skipInitialActivate = true,
    shouldRefresh = () => true
  } = options

  const lastRefreshedAt = ref(0)
  let activationCount = 0

  // 记录页面最近一次成功拉取时间，供下一次激活判断是否需要刷新。
  function markRefreshed() {
    lastRefreshedAt.value = Date.now()
  }

  // 满足条件时触发一次静默刷新。
  async function refreshIfNeeded() {
    if (typeof refreshFn !== 'function') return
    if (!shouldRefresh()) return
    if (lastRefreshedAt.value > 0 && Date.now() - lastRefreshedAt.value < minIntervalMs) return
    await refreshFn()
  }

  onActivated(async () => {
    activationCount += 1
    if (skipInitialActivate && activationCount === 1) return
    await refreshIfNeeded()
  })

  return {
    lastRefreshedAt,
    markRefreshed,
    refreshIfNeeded
  }
}
