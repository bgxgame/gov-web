import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { describe, expect, it, vi } from 'vitest'

/**
 * 职责：验证登录页组件在浏览器中的关键交互。
 * 为什么存在：登录页是前端所有会话链路的起点，最适合用组件测试保护表单提交与跳转。
 * 关联链路：登录、会话落盘、首页跳转。
 */

const push = vi.fn()
const login = vi.fn()
const showSuccess = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({ push })
}))

vi.mock('../../src/stores/session', () => ({
  useSessionStore: () => ({
    login,
    homePath: '/project/manage'
  })
}))

vi.mock('../../src/utils/feedback', () => ({
  showSuccess
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
  ElCard: { template: '<div><slot /></div>' },
  ElForm: { template: '<form><slot /></form>' },
  ElFormItem: { template: '<div><slot /></div>' },
  ElInput: ElInputStub,
  ElButton: ElButtonStub
}

describe('login view', () => {
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
    await wrapper.find('button').trigger('click')
    await nextTick()

    expect(login).toHaveBeenCalledWith({ username: 'admin', password: 'secret' })
    expect(showSuccess).toHaveBeenCalled()
    expect(push).toHaveBeenCalledWith('/project/manage')
  })
})
