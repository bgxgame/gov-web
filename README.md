# gov-web

前端技术栈：`Vue3 + Vite + Pinia + Vue Router + Element Plus + Axios + ECharts`。

## 开发命令
- `npm run dev`：启动开发环境
- `npm run build`：构建生产包
- `npm run test`：运行单元/组件测试（Vitest）
- `npm run test:e2e`：运行端到端测试（Playwright）

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
