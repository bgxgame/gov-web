# 前端测试说明

## 职责
- 说明前端测试分层、执行命令和维护约定。

## 为什么存在
- 让前端回归不再完全依赖人工点击。
- 保护轻量 model helper、会话逻辑和关键页面流转。

## 关键输入输出
- 单元测试：`tests/unit`
- 端到端测试：`tests/e2e`
- 执行命令：
  - `npm run test`
  - `npm run test:e2e`
  - `npm run build`

## 关联链路
- 登录跳转
- 项目管理分页
- 审批中心 tab 懒加载
- request / session / model helper 契约
