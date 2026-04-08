# gov-web

前端技术栈：`Vue 3 + Vite + Pinia + Vue Router + Element Plus + Axios + ECharts`

## 当前安全实现
- 认证主链已切换为同源 `HttpOnly Cookie`
- 前端不再把认证 token 写入 `localStorage` / `sessionStorage`
- 非 GET 请求会自动携带 `X-CSRF-Token`
- 用户缓存仅保留非敏感字段，内存优先，`sessionStorage` 兜底
- 页面 UI、布局和交互未做改版

## 常用命令
- `npm run dev`
- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run test:e2e`

## 运行时配置
- 运行时仍支持 `env.js` 覆盖构建时变量
- `deploy/kylin-arm/frontend.env.example` 提供部署模板
- Cookie 模式下需与后端保持一致的变量：
  - `VITE_APP_CSRF_COOKIE_NAME`
  - `VITE_APP_CSRF_HEADER_NAME`

## 测试说明
- 单元与组件测试：Vitest
- 端到端测试：Playwright
- `map-data` 不纳入本轮 lint 与规范整改范围

## 相关文档
- [前端整改计划](./docs/frontend-security-remediation-plan.md)
- [前端整改报告](./docs/frontend-security-remediation-report.md)
- [性能事件说明](./docs/PERF_EVENTS.md)
