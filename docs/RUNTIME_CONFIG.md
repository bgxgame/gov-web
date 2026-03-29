# 前端运行时配置说明

## 配置来源
- 通过 Vite 环境变量注入，示例见 `.env.example`
- 统一入口：`src/config/app-config.js`

## 关键配置项
- `VITE_APP_NAME`：应用名称，用于日志前缀
- `VITE_API_BASE_URL`：后端接口前缀
- `VITE_API_TIMEOUT`：接口超时时间，单位毫秒
- `VITE_APP_LOG_LEVEL`：日志级别，支持 `debug / info / warn / error`
- `VITE_APP_SLOW_REQUEST_MS`：慢请求阈值，超过后输出告警日志
- `VITE_APP_SLOW_ROUTE_MS`：慢路由阈值，超过后输出告警日志
- `VITE_APP_RUNTIME_LOG_BUFFER_SIZE`：浏览器侧保留的运行时日志条数
- `VITE_APP_FRONTEND_MONITOR_ENABLED`：是否启用前端运行监控上报
- `VITE_APP_FRONTEND_MONITOR_FLUSH_MS`：前端监控批量上报间隔
- `VITE_APP_FRONTEND_MONITOR_BATCH_SIZE`：前端监控单次上报条数
- `VITE_APP_FRONTEND_MONITOR_QUEUE_SIZE`：前端监控待上报队列上限
- `VITE_APP_ENABLE_FILE_LOG`：是否把 npm 运行日志落盘
- `VITE_APP_LOG_DIR`：前端文件日志目录
- `VITE_APP_LOG_KEEP_DAYS`：前端文件日志保留天数
- `VITE_APP_LOG_MAX_FILE_SIZE_MB`：前端单个日志文件大小上限，超过后自动滚动
- `VITE_APP_LOG_TOTAL_SIZE_MB`：前端日志目录总量上限，启动时自动清理最旧日志

## 日志策略
- 前端日志统一由 `src/utils/logger.js` 输出
- 默认会对 `password / token / authorization / phone / secret / key` 等敏感字段做脱敏
- 浏览器当前会话会把最近一段运行时日志保存在 `sessionStorage`，并同步挂到 `window.__GOV_APP_LOGS__`
- 页面脚本异常和未处理的 Promise 拒绝，也会自动写入同一份运行时日志缓冲
- 菜单点击、路由拦截、退出登录等关键用户动作也会写入运行时日志，便于复盘“点了没反应”这类体验问题
- 请求会自动注入 `X-Trace-Id`，方便和后端 `audit.log / perf.log / app.log` 串联定位
- `warn/error` 级别的关键运行日志会批量上报到后端 `/system/frontend-monitor/report`，由管理员在“系统设置 -> 前端监控”统一查看

## 请求取消策略
- 高并发、高频列表接口会附带固定 `cancelKey`
- 当同一类请求被再次触发时，旧请求会被自动取消，避免快速查询、切页、切 tab 时堆积无效请求
- 当前已接入的典型链路：
  - `/system/me`
  - 项目分页、地图点位
  - 审批待办、已办
  - 用户分页、角色分页、审计分页

## 常用排查方式
- 浏览器控制台执行 `window.__GOV_APP_LOGS__`：查看当前会话最近日志
- 关键日志优先关注 `traceId`：可到后端 `audit.log`、`perf.log`、`app.log` 中继续串联定位
- 如果怀疑菜单切换慢：
  - 先看前端是否有慢路由日志
  - 再对照同时间段后端 `perf.log` 中的分页、审批、审计查询日志
- 如果怀疑页面“点了没反应”：
  - 先看运行时日志里是否有重复请求取消记录
  - 再检查按钮 loading、路由进度条和后端慢接口日志

## 本地文件日志
- 开发日志：`npm run dev:log`，输出到 `./logs/frontend-dev-*.log`
- 构建日志：`npm run build:log`，输出到 `./logs/frontend-build-*.log`
- 自动清理策略：
  - 每次 `npm run dev` / `npm run build` 启动前，都会先按保留天数和目录总量做清理
  - 单个日志文件超过上限后会自动滚动为新的分片文件
- 手工清理历史日志：`npm run logs:clean`，默认按 7 天和 200MB 总量上限清理
