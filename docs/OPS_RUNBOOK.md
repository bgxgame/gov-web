# 前端运维与排障手册

## 1. 常用命令
- 启动开发环境：`npm run dev`
- 启动并记录开发日志：`npm run dev:log`
- 生产构建：`npm run build`
- 生产构建并记录日志：`npm run build:log`
- 关键烟雾巡检：`npm run test:smoke`
- 输出构建体积报告：`npm run build:stats`
- 清理旧日志：`npm run logs:clean`
- 本地端到端默认使用机器已安装的 `Chrome`；如需切换浏览器通道，设置 `PLAYWRIGHT_BROWSER_CHANNEL`

## 2. 本地日志位置
- 前端运行日志目录：`logs/`
- 开发日志文件前缀：`frontend-dev-*.log`
- 构建日志文件前缀：`frontend-build-*.log`
- 构建体积报告：`logs/build-stats-latest.md`

## 3. 常见问题处理
### 登录慢
- 检查控制台是否有慢路由日志
- 检查 `/system/me` 是否慢
- 检查后端数据库与登录链路日志

### 菜单点击没反应
- 检查是否发生权限回跳
- 检查是否出现请求被取消
- 检查是否有页面运行时错误

### 首页白屏或地图不显示
- 检查控制台是否有 ECharts 初始化错误
- 检查 `public/map-data/` 下资源文件是否齐全
- 检查 `public/map-data/resource-manifest.json` 是否指向了正确资源
- 检查地图摘要接口与点位接口是否返回数据

## 4. 运维约定
- 所有日志文件统一使用 UTF-8
- 所有新增脚本优先复用 `run-with-env-log.ps1`
- 配置变更同步更新 `.env.example` 与文档
