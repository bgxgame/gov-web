import { expect, test } from '@playwright/test'

/**
 * 职责：验证审批中心在真实浏览器里的关键交互。
 * 为什么存在：tab 懒加载属于性能优化项，最适合用 E2E 从用户视角确认没有回退。
 * 关联链路：审批中心待办、已办、tab 切换。
 */

/**
 * 作用：验证审批中心进入页面时只拉待办，切换到已办后才发送第二类请求。
 */
test('审批中心应按 tab 懒加载待办和已办数据', async ({ page }) => {
  let todoCount = 0
  let doneCount = 0

  await page.route('**/api/system/frontend-monitor/report', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 200,
        msg: '操作成功',
        data: true
      })
    })
  })

  await page.addInitScript(() => {
    window.localStorage.setItem('token', 'token-e2e')
    window.localStorage.setItem(
      'user_info',
      JSON.stringify({
        userId: 8,
        username: 'leader',
        roleCodes: ['dept_leader', 'user'],
        menuKeys: ['project:engineering']
      })
    )
  })

  await page.route('**/api/flow/todo**', async (route) => {
    todoCount += 1
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 200,
        msg: '操作成功',
        data: {
          records: [{ taskId: 't-1', taskName: '部门负责人审批', projectName: '河道治理项目', leaderName: '李工' }],
          total: 1,
          current: 1,
          size: 10
        }
      })
    })
  })

  await page.route('**/api/flow/done**', async (route) => {
    doneCount += 1
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 200,
        msg: '操作成功',
        data: {
          records: [{ taskId: 'd-1', taskName: '部门负责人审批', projectName: '河道治理项目', leaderName: '李工' }],
          total: 1,
          current: 1,
          size: 10
        }
      })
    })
  })

  await page.goto('/project/engineering')

  await expect.poll(() => todoCount).toBe(1)
  await expect.poll(() => doneCount).toBe(0)

  await page.locator('.el-tabs__item').nth(1).click()

  await expect.poll(() => doneCount).toBe(1)
})
