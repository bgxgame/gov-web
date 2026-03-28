import { expect, test } from '@playwright/test'

/**
 * 职责：验证登录主链路的端到端行为。
 * 为什么存在：这是前端最重要的入口流程，适合用 E2E 确认真实页面与路由是否协同正常。
 * 关联链路：登录、token 落盘、首页跳转。
 */

/**
 * 作用：验证登录成功后会跳到菜单允许的首页，并把 token 持久化到本地存储。
 */
test('登录后应跳转到菜单允许的首页', async ({ page }) => {
  await page.route('**/api/system/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 200,
        msg: '登录成功',
        data: {
          tokenValue: 'token-1',
          tokenName: 'Authorization',
          userId: 1,
          username: 'admin',
          roleCodes: ['admin', 'user'],
          menuKeys: ['project:manage']
        }
      })
    })
  })

  await page.route('**/api/project/page**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 200,
        msg: '操作成功',
        data: {
          records: [],
          total: 0,
          current: 1,
          size: 10
        }
      })
    })
  })

  await page.goto('/login')
  await page.locator('input').nth(0).fill('admin')
  await page.locator('input').nth(1).fill('secret')
  await page.locator('button').filter({ hasText: /登录|立即登录/ }).click()

  await expect(page).toHaveURL(/\/project\/manage/)
  await expect.poll(async () => page.evaluate(() => window.localStorage.getItem('token'))).toBe('token-1')
})
