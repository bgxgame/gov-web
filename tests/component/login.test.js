import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * 职责：验证登录页组件在浏览器中的关键交互。
 * 为什么存在：登录页是前端所有会话链路的起点，最适合用组件测试保护表单提交与跳转。
 * 关联链路：登录、会话落盘、首页跳转。
 */

const replace = vi.fn()
const login = vi.fn()
const showSuccess = vi.fn()
const getErrorMessage = vi.fn((error) => error?.msg || error?.message || '登录失败')
const sessionState = {
  homePath: '/project/manage'
}

vi.mock('vue-router', () => ({
  useRouter: () => ({ replace })
}))

vi.mock('../../src/stores/session', () => ({
  useSessionStore: () => ({
    login,
    homePath: sessionState.homePath
  }),
  resolveFirstEnabledMenuPath: () => '/system/user'
}))

vi.mock('../../src/utils/feedback', () => ({
  showSuccess,
  getErrorMessage
}))

const ElInputStub = {
  props: ['modelValue', 'type', 'placeholder'],
  emits: ['update:modelValue'],
  template: '<input :type="type || \'text\'" :placeholder="placeholder" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />'
}

const ElButtonStub = {
  template: '<button type="submit"><slot /></button>'
}

const globalStubs = {
  ElCard: { template: '<div><slot /></div>' },
  ElForm: { template: '<form><slot /></form>' },
  ElFormItem: { template: '<div><slot /></div>' },
  ElInput: ElInputStub,
  ElButton: ElButtonStub
}

describe('login view', () => {
  beforeEach(() => {
    replace.mockReset()
    login.mockReset()
    showSuccess.mockReset()
    getErrorMessage.mockReset()
    getErrorMessage.mockImplementation((error) => error?.msg || error?.message || '登录失败')
    sessionState.homePath = '/project/manage'
  })

  /**
   * 作用：验证登录页会调用登录动作，并在成功后跳到会话层计算出的首页。
   */
  it('should submit login form and jump to the resolved home path', async () => {
    login.mockResolvedValue({ data: { tokenValue: 'token-1' } })

    const LoginView = (await import('../../src/views/login/index.vue')).default
    const wrapper = mount(LoginView, {
      global: {
        stubs: globalStubs
      }
    })

    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('admin')
    await inputs[1].setValue('secret')
    await wrapper.find('form').trigger('submit')
    await nextTick()

    expect(login).toHaveBeenCalledWith({ username: 'admin', password: 'secret' })
    expect(showSuccess).toHaveBeenCalled()
    expect(replace).toHaveBeenCalledWith('/project/manage')
  })

  /**
   * 作用：验证会话层当前没有默认首页时，登录页会退回到环境开关允许的首个菜单入口。
   */
  it('should fall back to the first enabled menu path when home path is empty', async () => {
    sessionState.homePath = ''
    login.mockResolvedValue({ data: { tokenValue: 'token-2' } })

    const LoginView = (await import('../../src/views/login/index.vue')).default
    const wrapper = mount(LoginView, {
      global: {
        stubs: globalStubs
      }
    })

    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('admin')
    await inputs[1].setValue('secret')
    await wrapper.find('form').trigger('submit')
    await nextTick()

    expect(replace).toHaveBeenCalledWith('/system/user')
  })

  /**
   * 作用：验证登录失败时会在表单内显示明确错误，而不是只依赖顶部提示。
   */
  it('should show inline error message when login fails', async () => {
    login.mockRejectedValue({ msg: '账号已停用' })

    const LoginView = (await import('../../src/views/login/index.vue')).default
    const wrapper = mount(LoginView, {
      global: {
        stubs: globalStubs
      }
    })

    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('disabled-user')
    await inputs[1].setValue('secret')
    await wrapper.find('form').trigger('submit')
    await nextTick()

    expect(getErrorMessage).toHaveBeenCalled()
    expect(wrapper.text()).toContain('账号已停用')
    expect(showSuccess).not.toHaveBeenCalled()
    expect(replace).not.toHaveBeenCalled()
  })
})
