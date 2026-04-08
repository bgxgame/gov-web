# 前端安全整改报告

## 规范来源
- `JavaScript编程规范.txt`
- 本轮漏洞修复方案：Cookie 会话、CSRF、浏览器存储收口、统一运行时访问

## 命中问题
- 前端原链路依赖把 token 落地到浏览器存储并手工发送 `Authorization`
- 请求层和前端监控层缺少统一 CSRF 处理
- 会话、缓存、Cookie 与浏览器对象访问分散在多个模块
- 文档和部署模板未体现 Cookie + CSRF 新行为

## 改造动作
- 请求层切到同源 Cookie，会话凭据不再写入浏览器存储
- 非 GET 请求统一从 `XSRF-TOKEN` Cookie 读取并发送 `X-CSRF-Token`
- 新增浏览器运行时访问封装，统一 `window`、`document`、`fetch`、事件和 cookie 读写入口
- 用户缓存仅保留非敏感字段，并改为 `sessionStorage` 兜底
- `session store`、`router`、`frontend-monitor`、`request` 统一复用基础模块
- 更新前端部署模板和 README，补充 Cookie/CSRF 运行时变量说明
- 更新单元测试，覆盖 Cookie 模式下的登录态和前端监控上报

## 验证结果
- 前端 lint：PASS
  - `npm run lint`
- 前端测试：PASS
  - `npm run test`
- 前端构建：PASS
  - `npm run build`
- 交付包刷新：PASS
  - `dist/`
  - `../gov-project-backend/deploy-output/gov4/frontend/dist/`
  - `../gov-project-backend/deploy-output/gov4/frontend/frontend.env`

## 未完成项
- 待生成 frontend Git commit 后回填 commit id

## 剩余风险
- 本轮按纯 Web 同源场景实施，不保留外部系统长期 `Authorization` token 兼容链路
- 历史浏览器中的旧 `localStorage token` 会在新版本首次运行后被清理

## 交付位置
- 源码: `gov-web`
- 构建产物: `dist/`
- 部署模板: `deploy/kylin-arm/frontend.env.example`

## 对应 Commit
- frontend commit: pending
