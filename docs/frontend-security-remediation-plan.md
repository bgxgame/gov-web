# 前端安全规范整改计划

## 背景
本轮整改聚焦前端运行时访问、存储访问和最小 lint 门禁，不改变现网认证模型和 `env.js` 运行时配置方式。

## 本轮整改内容
- 新增浏览器运行时访问模块，统一封装 `window`、`location`、`fetch`、事件监听、定时器与 `requestIdleCallback`
- 新增浏览器存储访问模块，统一封装 `localStorage` / `sessionStorage`
- 将 `app-config.js`、`stores/session.js`、`router/index.js`、`request.js`、`logger.js`、`frontend-monitor.js`、`project-models.js` 迁移到基础模块
- `perf-metrics.js` 改为显式导入，去除 `import * as`
- 引入 ESLint，增加 `lint` 命令，并排除 `map-data`、`dist`、`deploy-output`

## 验证计划
- 运行 `npm run lint`
- 运行 `npm run test`
- 运行 `npm run build`
- 更新整改报告，记录验证结果与剩余风险
