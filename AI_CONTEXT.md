# GOV-WEB AI CONTEXT

Purpose: This file is optimized for AI handoff. Share this file together with `gov-project-backend/AI_CONTEXT.md` in new chats.

Repo: gov-web
Stack: Vue 3, Vite 8, Vue Router 4, Pinia, Element Plus, Axios, ECharts

## 1) What this frontend does
- Login and session management.
- Role/menu-driven navigation.
- Project CRUD + submit to approval flow.
- Approval task center (todo/done, approve/reject).
- System pages: users, departments, roles.
- Dashboard map for approved projects with map drill-down behavior.

## 2) Key files
- Entry/build:
  - `src/main.js`
  - `vite.config.js`
- Router/session:
  - `src/router/index.js`
  - `src/stores/session.js`
- HTTP:
  - `src/utils/request.js`
  - `src/api/auth.js`
  - `src/api/project.js`
  - `src/api/flow.js`
  - `src/api/system.js`
- Layout/pages:
  - `src/layout/index.vue`
  - `src/views/login/index.vue`
  - `src/views/dashboard/index.vue`
  - `src/views/project/manage.vue`
  - `src/views/project/engineering.vue`
  - `src/views/system/user.vue`
  - `src/views/system/dept.vue`
  - `src/views/system/role.vue`

## 3) Run/build
- Dev: `npm run dev`
- Build: `npm run build`
- Proxy: `/api` -> `http://localhost:8080`

## 4) Auth and access model
- Token storage: `localStorage.token`
- User info storage: `localStorage.user_info`
- Request header: `Authorization`
- Router access checks:
  - Primary gate: `route.meta.menus`
  - Fallback gate: `route.meta.roles` only when no menu gate
- Home route is resolved from menu priority:
  - `dashboard:view`, `project:manage`, `project:engineering`, `system:user`, `system:dept`, `system:role`

## 5) API surface used by frontend
- Auth:
  - `POST /system/login`
  - `GET /system/me`
  - `POST /system/logout`
- Project:
  - `GET /project/page`
  - `GET /project/get/{id}`
  - `POST /project/add`
  - `PUT /project/update`
  - `DELETE /project/{id}`
  - `POST /project/submit`
  - `GET /project/map/list`
- Flow:
  - `GET /flow/todo`
  - `GET /flow/done`
  - `POST /flow/approve`
- System:
  - user/dept/role endpoints under `/system/*`

## 6) Current business rules (must keep in sync with backend)
- Project editable/submittable/deletable statuses: `0` (draft) and `3` (rejected).
- Dashboard map shows approved projects only (`status = 2`).
- Data scope:
  - Admin: all data
  - Dept leader: department-scoped data
  - Normal user: own projects only
- Normal user cannot assign arbitrary project leader; leader must be self.

## 7) Dashboard map details
- Existing map resource: `public/map-data/610000.json` (Shaanxi, county-level geometry).
- Current UI behavior:
  - City-level overview: city aggregation points
  - District-level: district aggregation points
  - Project-level: project points with project detail drawer
- Important limitation:
  - With only `610000.json`, base geometry remains county-level.
  - True "city polygons -> district polygons" requires city-level JSON files (for example `610100.json`, etc.).

## 8) Performance status
- Element Plus on-demand auto import enabled.
- Vendor chunk split configured in `vite.config.js`.
- ECharts uses `echarts/core` APIs in dashboard page.
- Current heavy chunks are still `vendor-element-plus` and `vendor-echarts`, but better than full-bundle baseline.

## 9) Known risks
- Some historical text/comment encoding issues existed across project history.
- Keep all edits in UTF-8 without BOM.
- Follow .editorconfig on every edit; the repo encoding baseline is UTF-8 without BOM.
- 401 handling currently hard redirects (`window.location.replace('/login')`); acceptable but can be further unified.

## 10) AI onboarding checklist
When a new AI takes over, ask it to read these files first:
1. `src/router/index.js`
2. `src/stores/session.js`
3. `src/views/dashboard/index.vue`
4. `src/views/project/manage.vue`
5. `src/views/system/user.vue`

Then enforce these constraints:
- Menu keys are the primary permission source.
- Project status rule: only 0 and 3 are editable actions.
- Map endpoint is approved-only by default.
- Follow `.editorconfig`, preserve UTF-8 without BOM, and avoid permission regressions.
