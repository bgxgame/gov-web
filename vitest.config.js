import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

/**
 * 前端单元测试配置。
 * 这里统一接管 jsdom 环境、Vue SFC 支持和公共 setup 脚本。
 * 同时使用 threads 池提升整套测试吞吐，并适度放宽超时时间，
 * 避免复杂组件在 Windows 本地环境下因为默认 5 秒阈值而误报超时。
 */
export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    globals: true,
    pool: 'threads',
    testTimeout: 10000,
    setupFiles: ['./tests/setup/vitest.setup.js'],
    include: ['tests/unit/**/*.test.js', 'tests/component/**/*.test.js']
  }
})
