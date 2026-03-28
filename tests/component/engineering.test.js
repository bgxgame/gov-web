import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

/**
 * 职责：验证审批中心组件的懒加载行为。
 * 为什么存在：审批中心这轮做过性能优化，必须确认“只在切换 tab 时才加载已办数据”没有回退。
 * 关联链路：审批中心首屏加载、tab 切换、分页数据请求。
 */

const fetchTodoPage = vi.fn()
const fetchDonePage = vi.fn()
const approveTaskDecision = vi.fn()
const confirmAction = vi.fn()
const showSuccess = vi.fn()

vi.mock('../../src/api/flow', () => ({
  fetchTodoPage,
  fetchDonePage,
  approveTaskDecision
}))

vi.mock('../../src/utils/feedback', () => ({
  confirmAction,
  showSuccess
}))

const ElTabsStub = {
  props: ['modelValue'],
  emits: ['update:modelValue', 'tab-change'],
  template: `
    <div>
      <button data-tab="todo" @click="$emit('update:modelValue', 'todo'); $emit('tab-change', 'todo')">todo</button>
      <button data-tab="done" @click="$emit('update:modelValue', 'done'); $emit('tab-change', 'done')">done</button>
      <slot />
    </div>
  `
}

const globalStubs = {
  ElCard: { template: '<div><slot name="header" /><slot /></div>' },
  ElButton: { emits: ['click'], template: '<button @click="$emit(\'click\')"><slot /></button>' },
  ElTabs: ElTabsStub,
  ElTabPane: { template: '<section><slot /></section>' },
  ElTable: { template: '<div><slot /></div>' },
  ElTableColumn: { template: '<div />' },
  ElPagination: { template: '<div />' }
}

describe('engineering view', () => {
  /**
   * 作用：验证页面初始化只请求待办，切换到已办 tab 后才补发第二次请求。
   */
  it('should lazy load done tab after initial todo request', async () => {
    fetchTodoPage.mockResolvedValue({
      data: { records: [{ taskId: 't-1', taskName: '部门负责人审批' }], total: 1 }
    })
    fetchDonePage.mockResolvedValue({
      data: { records: [{ taskId: 'd-1', taskName: '部门负责人审批' }], total: 1 }
    })

    const EngineeringView = (await import('../../src/views/project/engineering.vue')).default
    const wrapper = mount(EngineeringView, {
      global: {
        stubs: globalStubs
      }
    })

    await Promise.resolve()
    await Promise.resolve()

    expect(fetchTodoPage).toHaveBeenCalledTimes(1)
    expect(fetchDonePage).not.toHaveBeenCalled()

    await wrapper.find('[data-tab="done"]').trigger('click')
    await Promise.resolve()
    await Promise.resolve()

    expect(fetchDonePage).toHaveBeenCalledTimes(1)
  })
})
