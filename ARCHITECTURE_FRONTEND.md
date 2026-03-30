# 前端架构说明（交接版）

> 项目路径：`C:\Users\brace\Documents\work\gov\gov-web`

## 1. 技术与定位

前端是 Vue3 + Vite 的后台管理项目，负责：

- 登录与会话恢复
- 路由与菜单权限控制
- 项目管理与审批中心
- 首页地图下钻可视化
- 系统管理（用户/部门/角色/审计/前端监控）
- 运行时日志采集与前端监控上报

核心依赖见 `package.json`：Vue、Pinia、Vue Router、Element Plus、Axios、ECharts。

## 2. 目录结构与职责

- `src/main.js`：应用入口，安装 Pinia/Router/监控
- `src/router/index.js`：路由表 + 守卫 + 权限判定
- `src/stores/session.js`：会话态、用户权限、默认首页
- `src/utils/request.js`：统一请求层（token/trace/错误处理）
- `src/api/*`：按业务域封装接口
- `src/views/*`：各业务页面
- `src/layout/index.vue`：主布局、菜单、keep-alive 容器
- `src/utils/logger.js`：运行时日志缓冲
- `src/utils/frontend-monitor.js`：前端日志批量上报

## 3. 启动与权限主链路

1. `main.js` 启动应用并安装全局异常监听
2. 登录页调用 `sessionStore.login`
3. `sessionStore` 持久化 `token + userInfo`
4. `router.beforeEach` 做鉴权与权限校验：
   - 未登录跳 `/login`
   - 登录后补拉 `/system/me`
   - 按 `meta.menus/meta.roles` 判断可访问性

## 4. 请求层约定

`request.js` 统一处理：

- 自动带 `Authorization`
- 自动带 `X-Trace-Id`
- 统一解包后端 `R(code,msg,data)`
- 401 清会话并跳登录
- 慢请求日志
- 同类请求取消（`cancelKey`）

页面层不直接处理协议细节，只处理业务成功分支。

## 5. 页面模块映射

- 登录：`views/login/index.vue`
- 首页地图：`views/dashboard/index.vue`
- 项目管理：`views/project/manage.vue`
- 工程审批：`views/project/engineering.vue`
- 用户管理：`views/system/user.vue`
- 部门管理：`views/system/dept.vue`
- 角色管理：`views/system/role.vue`
- 审计日志：`views/system/audit.vue`
- 前端监控：`views/system/frontend-monitor.vue`

对应 API 模块：

- `api/auth.js`
- `api/project.js`
- `api/flow.js`
- `api/system.js`

## 6. 首页地图实现要点

页面：`views/dashboard/index.vue`

数据接口：

- `/project/map/summary`：区域聚合
- `/project/map/list`：项目点位
- `/project/get/{id}`：项目详情

能力：

- 省 -> 市 -> 区县下钻
- GeoJSON 资源候选 + manifest
- 资源与数据缓存
- 区域中心点回退策略

辅助工具：

- `utils/map-drilldown.js`
- `constants/region-tree.js`
- `utils/region-options.js`

## 7. 系统管理页实现要点

用户/部门/角色页都采用同一模式：

- 查询表单 + 分页对象
- API 参数构建器（`utils/system-models.js`）
- 弹窗编辑（新增/更新）
- 成功后静默刷新
- 页面激活刷新（`utils/activated-refresh.js`）

审计与前端监控页：

- 采用时间范围 + 关键字组合检索
- 参数由 `utils/audit-models.js`、`utils/frontend-monitor-models.js` 统一转换

## 8. 前端监控与可观测

链路：

1. `logger.js` 采集运行时日志与全局错误
2. `frontend-monitor.js` 过滤 `warn/error` 并批量上报
3. 上报接口：`/system/frontend-monitor/report`
4. 管理端页面检索：`/system/frontend-monitor/page`

补充：

- 路由耗时观测：`utils/route-progress.js`
- trace 维护：`utils/trace.js`

## 9. 构建与测试

- 开发：`npm run dev`
- 构建：`npm run build`
- 单元测试：`npm run test`（Vitest）
- E2E：`npm run test:e2e`（Playwright）
- 烟雾：`npm run test:smoke`

配置文件：

- `vite.config.js`
- `vitest.config.js`
- `playwright.config.js`

## 10. 新需求改造入口

- 新页面：`views/*` + `router/index.js` + `layout/index.vue` 菜单条件
- 新接口：`api/*` + 对应 `utils/*-models.js`
- 新权限：`route meta.menus/meta.roles` + `sessionStore` 权限判断
- 新监控事件：`logger.logUserAction` 或 `logger.warn/error`（自动进入上报链路）
- 地图改造：优先动 `dashboard/index.vue` 和 `map-drilldown.js`

## 11. 建议阅读顺序

1. `main.js`
2. `stores/session.js`
3. `router/index.js`
4. `utils/request.js`
5. `layout/index.vue`
6. `views/project/manage.vue` + `views/project/engineering.vue`
7. `views/dashboard/index.vue`
8. `views/system/*`
