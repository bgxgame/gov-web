import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

/**
 * 职责：验证项目管理页的首屏与弹窗数据加载策略。
 * 为什么存在：项目页这轮做了“首屏只拉列表、负责人候选懒加载”的优化，需要组件测试锁住行为。
 * 关联链路：项目分页、项目新增弹窗、负责人候选缓存。
 */

const getUserSimple = vi.fn()
const fetchProjectPageByForm = vi.fn()
const getProjectDetail = vi.fn()
const saveProjectForm = vi.fn()
const submitProjectById = vi.fn()
const deleteProject = vi.fn()
const confirmAction = vi.fn()
const showError = vi.fn()
const showSuccess = vi.fn()
const showWarning = vi.fn()

vi.mock('../../src/api/system', () => ({
  getUserSimple
}))

vi.mock('../../src/api/project', () => ({
  fetchProjectPageByForm,
  getProjectDetail,
  saveProjectForm,
  submitProjectById,
  deleteProject
}))

vi.mock('../../src/stores/session', () => ({
  useSessionStore: () => ({
    userInfo: { userId: 10, deptId: 9 },
    hasRole: () => false
  })
}))

vi.mock('../../src/utils/feedback', () => ({
  confirmAction,
  showError,
  showSuccess,
  showWarning
}))

const ElInputStub = {
  props: ['modelValue', 'type', 'placeholder'],
  emits: ['update:modelValue'],
  template: '<input :type="type || \'text\'" :placeholder="placeholder" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />'
}

const ElButtonStub = {
  emits: ['click'],
  template: '<button @click="$emit(\'click\')"><slot /></button>'
}

const globalStubs = {
  ElCard: { template: '<div><slot name="header" /><slot /></div>' },
  ElForm: { template: '<form><slot /></form>' },
  ElFormItem: { template: '<div><slot /></div>' },
  ElInput: ElInputStub,
  ElButton: ElButtonStub,
  ElSelect: {
    props: ['modelValue'],
    emits: ['update:modelValue', 'change'],
    template: '<select @change="$emit(\'update:modelValue\', $event.target.value); $emit(\'change\', $event.target.value)"><slot /></select>'
  },
  ElOption: { props: ['label', 'value'], template: '<option :value="value">{{ label }}</option>' },
  ElTable: { template: '<div><slot /></div>' },
  ElTableColumn: { template: '<div />' },
  ElPagination: { template: '<div />' },
  ElDialog: { props: ['modelValue'], template: '<div><slot v-if="modelValue" /><slot name="footer" v-if="modelValue" /></div>' },
  ElRow: { template: '<div><slot /></div>' },
  ElCol: { template: '<div><slot /></div>' },
  ElTag: { template: '<span><slot /></span>' },
  ElDescriptions: { template: '<div><slot /></div>' },
  ElDescriptionsItem: { template: '<div><slot /></div>' }
}

describe('manage view', () => {
  /**
   * 作用：验证页面首屏只查列表，负责人候选只在弹窗打开时加载且只加载一次。
   */
  it('should fetch table data on mount and lazy load user options only once', async () => {
    fetchProjectPageByForm.mockResolvedValue({
      data: { records: [], total: 0 }
    })
    getUserSimple.mockResolvedValue({
      data: [
        { id: 10, username: 'zhangsan', realName: '张三', phone: '13800000000' },
        { id: 11, username: 'lisi', realName: '李四', phone: '13800000001' }
      ]
    })

    const ManageView = (await import('../../src/views/project/manage.vue')).default
    const wrapper = mount(ManageView, {
      global: {
        stubs: globalStubs
      }
    })

    await Promise.resolve()
    await Promise.resolve()

    expect(fetchProjectPageByForm).toHaveBeenCalledTimes(1)

    const buttons = wrapper.findAll('button')
    await buttons[2].trigger('click')
    await Promise.resolve()
    await Promise.resolve()
    await buttons[2].trigger('click')
    await Promise.resolve()
    await Promise.resolve()

    expect(getUserSimple).toHaveBeenCalledTimes(1)
  })
})
