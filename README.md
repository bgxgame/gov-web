# gov-web

前端技术栈：`Vue3 + Vite + Pinia + Vue Router + Element Plus + Axios + ECharts`。

## 架构文档
- 前端专版架构说明：[`ARCHITECTURE_FRONTEND.md`](./ARCHITECTURE_FRONTEND.md)
- 全项目总览（前后端）：[`../PROJECT_ARCHITECTURE.md`](../PROJECT_ARCHITECTURE.md)
- 前端性能埋点事件说明：[`docs/PERF_EVENTS.md`](./docs/PERF_EVENTS.md)

## 开发命令
- `npm run dev`：启动开发环境
- `npm run build`：构建生产包
- `npm run test`：运行单元/组件测试（Vitest）
- `npm run test:e2e`：运行端到端测试（Playwright）
- `npm run test:smoke`：运行登录、首页地图、审批中心三条关键烟雾链路
- `npm run build:stats`：构建并输出体积报告

## 端到端测试说明
- `Playwright` 默认直接复用本机已安装的 `Chrome` 通道，避免额外下载内置浏览器
- 如需切换浏览器通道，可通过环境变量 `PLAYWRIGHT_BROWSER_CHANNEL=edge` 等方式覆盖
- 首页地图烟雾测试已兼容中文 GeoJSON 文件名的 URL 编码场景

## 地图资源
- 通用兜底资源放在 `public/map-data/province.geojson`、`city.geojson`、`county.geojson`
- 如果已经下载了分层地图资源，建议补 `public/map-data/resource-manifest.json`
- 详细约定见 [docs/MAP_RESOURCE_GUIDE.md](./docs/MAP_RESOURCE_GUIDE.md)

## `.env` 日志开关
为了让“改 `.env` 后有可见效果”，`dev/build` 命令已支持按 `.env` 自动写日志。

可用变量：
- `VITE_APP_ENABLE_FILE_LOG=true|false`
- `VITE_APP_LOG_DIR=logs`

示例：
```env
VITE_APP_ENABLE_FILE_LOG=true
VITE_APP_LOG_DIR=logs
```

开启后：
- `npm run dev` 会输出 `logs/frontend-dev-时间戳.log`
- `npm run build` 会输出 `logs/frontend-build-时间戳.log`

也可强制写日志：
- `npm run dev:log`
- `npm run build:log`
