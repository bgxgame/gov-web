# 观测性基线

## 1. 目标
- 让前后端问题能够按同一条 `traceId` 串起来
- 让“登录慢、菜单无响应、接口异常、前端白屏”都有固定排查入口
- 形成开发、测试、运维都能复用的统一排障路径

## 2. 前端观测入口
- 浏览器控制台日志：`src/utils/logger.js`
- 会话内运行日志：`window.__GOV_APP_LOGS__`
- 慢路由日志：`src/utils/route-progress.js`
- 慢请求日志：`src/utils/request.js`
- 前端监控上报：后端 `/system/frontend-monitor/report`

## 3. 后端观测入口
- `logs/app.log`：应用主日志
- `logs/error.log`：错误日志
- `logs/audit.log`：审计日志
- `logs/perf.log`：性能日志
- `logback-spring.xml`：日志滚动策略与编码配置

## 4. 推荐排查顺序
1. 先复现问题并记录时间
2. 在浏览器控制台或 `window.__GOV_APP_LOGS__` 获取 `traceId`
3. 联查后端 `perf.log` 和 `app.log`
4. 如果是权限或用户态问题，再联查 `audit.log`
5. 如果是前端白屏或脚本报错，优先看运行时错误缓冲

## 5. 当前缺口
- 还没有自动输出可视化性能报表，当前以构建统计与日志为主
- 前端监控页面的数据治理还可以继续加强
- 地图资源加载链路的细粒度指标仍可继续补充
