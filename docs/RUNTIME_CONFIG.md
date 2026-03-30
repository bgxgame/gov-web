# 前端运行时配置说明

## 1. 配置入口
- 环境变量文件：`.env`
- 示例配置：`.env.example`
- 统一读取入口：`src/config/app-config.js`
- 日志与构建脚本：`scripts/run-with-env-log.ps1`

## 2. 关键配置项
| 变量名 | 说明 | 默认值 | 建议 |
| --- | --- | --- | --- |
| `VITE_APP_NAME` | 前端应用名称，会出现在控制台日志前缀中 | `gov-web` | 多环境可保持一致 |
| `VITE_API_BASE_URL` | 前端请求后端的统一前缀 | `/api` | 生产环境建议配合网关或反向代理 |
| `VITE_API_TIMEOUT` | 接口超时时间，单位毫秒 | `10000` | 联调环境建议不低于 `8000` |
| `VITE_APP_LOG_LEVEL` | 控制台日志级别 | `warn` | 生产环境建议 `warn`，开发环境可临时调 `debug` |
| `VITE_APP_SLOW_REQUEST_MS` | 慢请求阈值，超过后记录告警日志 | `800` | 结合后端 `perf.log` 一起看 |
| `VITE_APP_SLOW_ROUTE_MS` | 常规路由切换慢阈值 | `800` | 菜单切换明显迟缓时重点关注 |
| `VITE_APP_SLOW_INITIAL_ROUTE_MS` | 首次进入系统的慢阈值 | `1600` | 用于区分冷启动与普通切页 |
| `VITE_APP_RUNTIME_LOG_BUFFER_SIZE` | 浏览器会话内保留的运行时日志条数 | `200` | 不建议过大，避免占用会话存储 |
| `VITE_APP_FRONTEND_MONITOR_ENABLED` | 是否启用前端监控上报 | `true` | 生产环境建议开启 |
| `VITE_APP_FRONTEND_MONITOR_FLUSH_MS` | 前端监控批量上报间隔 | `10000` | 告警多时可适当调小 |
| `VITE_APP_FRONTEND_MONITOR_BATCH_SIZE` | 单次上报条数 | `20` | 与后端吞吐能力一起评估 |
| `VITE_APP_FRONTEND_MONITOR_QUEUE_SIZE` | 本地待上报队列上限 | `100` | 避免异常高峰时无限堆积 |
| `VITE_APP_ENABLE_FILE_LOG` | 是否将 `npm run dev/build` 输出写入日志文件 | `true` | 本地排查问题时建议开启 |
| `VITE_APP_LOG_DIR` | 前端日志目录 | `logs` | 建议保留在项目根目录下 |
| `VITE_APP_LOG_KEEP_DAYS` | 前端日志保留天数 | `7` | 本地开发一般够用 |
| `VITE_APP_LOG_MAX_FILE_SIZE_MB` | 单个日志文件大小上限 | `20` | 超过会自动滚动分片 |
| `VITE_APP_LOG_TOTAL_SIZE_MB` | 日志目录总体积上限 | `200` | 启动时会自动清理旧日志 |

## 3. 当前日志与观测链路
- 前端请求会自动注入 `Authorization` 和 `X-Trace-Id`
- 关键运行日志由 `src/utils/logger.js` 统一输出
- 请求链路由 `src/utils/request.js` 统一处理响应解析、错误提示、慢请求告警与 401 会话清理
- 路由切换耗时由 `src/utils/route-progress.js` 记录
- 运行时错误会写入 `window.__GOV_APP_LOGS__`
- `warn / error` 级别日志会按批次上报到后端前端监控接口

## 4. 常用排查动作
### 4.1 登录慢、切菜单慢
- 先看浏览器控制台是否有“页面路由加载耗时偏高”或“检测到慢请求”日志
- 再看 `window.__GOV_APP_LOGS__` 中对应时间段的 `traceId`
- 最后到后端 `logs/perf.log`、`logs/app.log` 里按 `traceId` 继续定位

### 4.2 菜单点击后没反应
- 检查是否出现“重复请求已取消”日志
- 检查是否发生 401 被统一登出
- 检查路由守卫是否因为权限不足而回跳

### 4.3 本地日志落盘
- 开发日志：`npm run dev:log`
- 构建日志：`npm run build:log`
- 手动清理：`npm run logs:clean`

## 5. 维护约定
- 所有新增配置优先放到 `app-config.js` 统一收口，不要在页面里直接读 `import.meta.env`
- 文档、脚本、配置注释统一使用 UTF-8 无 BOM
- 影响链路追踪的请求不要绕过 `src/utils/request.js`
