import { defineConfig } from '@playwright/test'

/**
 * 前端端到端测试配置。
 * 统一先构建，再通过 `vite preview` 提供稳定的静态预览服务，
 * 避免 Vite 开发态首次预构建时出现 `Outdated Optimize Dep` 干扰测试。
 * 浏览器继续优先复用本机安装的 Chrome。
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  fullyParallel: true,
  use: {
    baseURL: 'http://127.0.0.1:4175',
    channel: process.env.PLAYWRIGHT_BROWSER_CHANNEL || 'chrome',
    trace: 'on-first-retry'
  },
  webServer: {
    command: 'cmd /c "npm run build && npx vite preview --host 127.0.0.1 --port 4175"',
    url: 'http://127.0.0.1:4175',
    reuseExistingServer: true,
    timeout: 240000
  }
})
