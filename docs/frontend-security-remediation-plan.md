# 前端安全整改计划

## 背景
本轮前端整改在不改变现有 UI、布局、交互和用户体验的前提下，重点收口认证、会话、浏览器存储、附件访问与前端门禁规则。

## 规范来源
- `JavaScript编程规范.txt`
- 现有前端规范整改要求
- 本轮追加的真实漏洞修复要求：Cookie 会话、CSRF、去 token 落地、统一浏览器能力访问

## 整改范围
- 切换到同源 Cookie 认证
- 前端不再持久化 token，不再手工发送 `Authorization`
- 非 GET 请求自动带 `X-CSRF-Token`
- 用户缓存改为非敏感字段 + `sessionStorage` 兜底
- 收口 `window` / `document` / 存储访问到基础模块
- 保留 `env.js` 运行时配置模式
- 维持附件列表、预览、下载的原页面体验不变
- 保留 `map-data` 排除策略，不纳入本轮 lint

## 重点文件
- `src/config/app-config.js`
- `src/utils/browser-runtime.js`
- `src/utils/browser-storage.js`
- `src/utils/request.js`
- `src/utils/frontend-monitor.js`
- `src/stores/session.js`
- `src/router/index.js`
- `tests/unit/session.test.js`
- `tests/unit/frontend-monitor.test.js`

## 验证计划
- `npm run lint`
- `npm run test`
- `npm run build`
- 刷新前端 `dist/`
- 更新整改报告与构建结果
