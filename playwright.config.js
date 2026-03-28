import { defineConfig } from '@playwright/test'

/**
 * 前端端到端测试配置。
 * 使用本地 Vite 开发服务器承载真实页面，再通过接口 mock 保持测试稳定。
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    channel: 'chrome',
    trace: 'on-first-retry'
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
    timeout: 120000
  }
})
