import { beforeEach } from 'vitest'
import { config } from '@vue/test-utils'

/**
 * 职责：为前端单元测试和组件测试提供统一的运行环境。
 * 为什么存在：避免每个测试文件重复清理本地存储、重复补齐 Element Plus 指令依赖。
 * 关键输入输出：输入为每条用例执行前的初始化时机，输出为干净的浏览器状态和全局测试配置。
 * 关联链路：登录态恢复、项目管理组件、审批中心组件。
 */

// 组件测试中会命中 Element Plus 的 v-loading 指令，这里提供空实现即可。
config.global.directives = {
  ...(config.global.directives || {}),
  loading: {
    mounted() {},
    updated() {}
  }
}

beforeEach(() => {
  window.localStorage.clear()
})
