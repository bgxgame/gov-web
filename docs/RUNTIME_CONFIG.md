# 前端运行时配置说明

## 配置来源
- 通过 Vite 环境变量注入，示例见 `.env.example`。
- 统一入口：`src/config/app-config.js`。

## 关键配置项
- `VITE_APP_NAME`：应用名称（日志前缀）。
- `VITE_API_BASE_URL`：后端接口前缀。
- `VITE_API_TIMEOUT`：请求超时时间（毫秒）。
- `VITE_APP_LOG_LEVEL`：日志级别（`debug/info/warn/error`）。

## 日志策略
- 前端日志通过 `src/utils/logger.js` 统一输出。
- 默认会对 `password/token/authorization/phone/secret/key` 等字段做脱敏处理。
- 浏览器日志建议配合后端审计日志一起排障（通过 `X-Trace-Id` 对齐链路）。

## 本地文件日志（开发/构建）
- 开发日志：`npm run dev:log`，输出到 `./logs/frontend-dev-*.log`
- 构建日志：`npm run build:log`，输出到 `./logs/frontend-build-*.log`
- 清理历史日志：`npm run logs:clean`（默认保留 7 天）
