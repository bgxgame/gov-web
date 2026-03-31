import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

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
const uploadProjectAttachment = vi.fn()
const cleanupProjectTempAttachments = vi.fn()
const confirmAction = vi.fn()
const showError = vi.fn()
const showSuccess = vi.fn()
const showWarning = vi.fn()
const sessionState = {
  userInfo: {
    userId: 10,
    deptId: 9,
    username: 'zhangsan',
    realName: '张三',
    phone: '13800000000'
  },
  hasRole: vi.fn(() => false)
}

vi.mock('../../src/api/system', () => ({
  getUserSimple
}))

vi.mock('../../src/api/project', () => ({
  fetchProjectPageByForm,
  getProjectDetail,
  saveProjectForm,
  submitProjectById,
  deleteProject,
  uploadProjectAttachment,
  cleanupProjectTempAttachments
}))

vi.mock('../../src/stores/session', () => ({
  useSessionStore: () => sessionState
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
    props: ['modelValue', 'disabled'],
    emits: ['update:modelValue', 'change'],
    template:
      '<select :value="modelValue" :disabled="disabled" @change="$emit(\'update:modelValue\', $event.target.value); $emit(\'change\', $event.target.value)"><slot /></select>'
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
  ElDescriptionsItem: { template: '<div><slot /></div>' },
  ElUpload: { template: '<div><slot /></div>' },
  ElIcon: { template: '<i><slot /></i>' },
  ElImage: { props: ['src'], template: '<img :src="src" />' },
  ElProgress: { props: ['percentage'], template: '<div>{{ percentage }}</div>' }
}

describe('项目管理页', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    sessionState.userInfo = {
      userId: 10,
      deptId: 9,
      username: 'zhangsan',
      realName: '张三',
      phone: '13800000000'
    }
    sessionState.hasRole.mockImplementation(() => false)
  })

  async function flushView() {
    await Promise.resolve()
    await Promise.resolve()
    await nextTick()
  }

  /**
   * 作用：验证普通用户新增项目时直接复用当前用户信息，不再额外请求负责人列表。
   */
  it('普通用户打开新增弹窗时应直接复用当前用户信息', async () => {
    fetchProjectPageByForm.mockResolvedValue({
      data: { records: [], total: 0 }
    })

    const ManageView = (await import('../../src/views/project/manage.vue')).default
    const wrapper = mount(ManageView, {
      global: {
        stubs: globalStubs
      }
    })

    await flushView()

    expect(fetchProjectPageByForm).toHaveBeenCalledTimes(1)

    const buttons = wrapper.findAll('button')
    await buttons[2].trigger('click')
    await flushView()
    await buttons[2].trigger('click')
    await flushView()

    expect(getUserSimple).not.toHaveBeenCalled()
    expect(wrapper.html()).toContain('张三 (zhangsan)')
    expect(wrapper.html()).toContain('13800000000')
  })

  /**
   * 作用：验证管理员首次打开新增弹窗时才懒加载负责人列表，重复打开不会重复请求。
   */
  it('管理员打开新增弹窗时应只懒加载一次负责人列表', async () => {
    sessionState.hasRole.mockImplementation((role) => role === 'admin')
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

    await flushView()

    const buttons = wrapper.findAll('button')
    await buttons[2].trigger('click')
    await flushView()
    await buttons[2].trigger('click')
    await flushView()

    expect(getUserSimple).toHaveBeenCalledTimes(1)
  })

  it('should cascade province city district filters and reset downstream selections', async () => {
    fetchProjectPageByForm.mockResolvedValue({
      data: { records: [], total: 0 }
    })
    getUserSimple.mockResolvedValue({ data: [] })

    const ManageView = (await import('../../src/views/project/manage.vue')).default
    const wrapper = mount(ManageView, {
      global: {
        stubs: globalStubs
      }
    })

    await flushView()

    const selects = wrapper.findAll('select')
    expect(selects[1].findAll('option').map((item) => item.text())).toContain('陕西省')

    await selects[1].setValue('陕西省')
    await flushView()
    expect(selects[2].findAll('option').map((item) => item.text())).toContain('西安市')

    await selects[2].setValue('西安市')
    await flushView()
    expect(selects[3].findAll('option').map((item) => item.text())).toContain('雁塔区')

    await selects[3].setValue('雁塔区')
    await flushView()

    await selects[1].setValue('')
    await flushView()

    const latestQueryForm = fetchProjectPageByForm.mock.calls.at(0)?.[0]
    expect(latestQueryForm.province).toBe('')
    expect(latestQueryForm.city).toBe('')
    expect(latestQueryForm.district).toBe('')
  })

  it('取消新增弹窗时应自动清理未绑定的临时附件', async () => {
    fetchProjectPageByForm.mockResolvedValue({
      data: { records: [], total: 0 }
    })
    uploadProjectAttachment.mockResolvedValue({
      data: {
        id: 88,
        fileName: '方案说明.txt',
        fileType: 'text/plain',
        fileSize: 12,
        isImage: false,
        accessUrl: 'https://example.com/file.txt'
      }
    })
    cleanupProjectTempAttachments.mockResolvedValue({ msg: '已清理1个临时附件' })

    const ManageView = (await import('../../src/views/project/manage.vue')).default
    const wrapper = mount(ManageView, {
      global: {
        stubs: globalStubs
      }
    })

    await flushView()

    await wrapper.vm.openCreateDialog()
    await flushView()

    await wrapper.vm.handleAttachmentUpload({
      file: new File(['demo'], 'demo.txt', { type: 'text/plain' }),
      onSuccess: vi.fn(),
      onError: vi.fn()
    })
    await flushView()

    wrapper.vm.handleCloseEditDialog()
    await flushView()

    expect(cleanupProjectTempAttachments).toHaveBeenCalledWith([88])
  })
})
