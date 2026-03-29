import { mount } from '@vue/test-utils'
import { KeepAlive, defineComponent, h, nextTick, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useActivatedRefresh } from '../../src/utils/activated-refresh'

/**
 * 职责：验证 keep-alive 页面回到前台后的静默刷新策略。
 * 为什么存在：页面缓存是性能优化重点，必须确认“首次不重复拉取、切回时按时间窗口刷新”不回退。
 * 关联链路：layout keep-alive、核心列表页 onActivated 刷新。
 */

function createParentComponent(refreshSpy, allowRefreshRef, minIntervalMs = 1000) {
  const CachedChild = defineComponent({
    name: 'CachedChild',
    setup() {
      const { markRefreshed } = useActivatedRefresh(refreshSpy, {
        minIntervalMs,
        shouldRefresh: () => allowRefreshRef.value
      })
      markRefreshed()
      return () => h('div', 'cached-child')
    }
  })

  const EmptyChild = defineComponent({
    name: 'EmptyChild',
    setup() {
      return () => h('div', 'empty-child')
    }
  })

  return defineComponent({
    name: 'ActivatedRefreshHarness',
    setup() {
      const currentView = ref('cached')
      return { currentView }
    },
    render() {
      const currentComponent = this.currentView === 'cached' ? CachedChild : EmptyChild
      return h(KeepAlive, null, [h(currentComponent)])
    }
  })
}

describe('activated refresh helper', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should skip the initial keep-alive activation refresh', async () => {
    const refreshSpy = vi.fn()
    const allowRefreshRef = ref(true)
    const Parent = createParentComponent(refreshSpy, allowRefreshRef)

    mount(Parent)
    await nextTick()

    expect(refreshSpy).not.toHaveBeenCalled()
  })

  it('should refresh when page is activated after the minimum interval', async () => {
    const refreshSpy = vi.fn()
    const allowRefreshRef = ref(true)
    const Parent = createParentComponent(refreshSpy, allowRefreshRef)
    const wrapper = mount(Parent)

    wrapper.vm.currentView = 'empty'
    await nextTick()
    vi.advanceTimersByTime(1200)

    wrapper.vm.currentView = 'cached'
    await nextTick()
    await Promise.resolve()

    expect(refreshSpy).toHaveBeenCalledTimes(1)
  })

  it('should skip refresh when shouldRefresh returns false', async () => {
    const refreshSpy = vi.fn()
    const allowRefreshRef = ref(false)
    const Parent = createParentComponent(refreshSpy, allowRefreshRef)
    const wrapper = mount(Parent)

    wrapper.vm.currentView = 'empty'
    await nextTick()
    vi.advanceTimersByTime(1200)
    wrapper.vm.currentView = 'cached'
    await nextTick()
    await Promise.resolve()

    expect(refreshSpy).not.toHaveBeenCalled()
  })
})
