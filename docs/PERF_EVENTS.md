# Frontend Perf Events

## Where To View
- System page: `系统管理 -> 前端监控`
- Filter tips:
  - `日志级别`: `INFO/WARN/ERROR`
  - `日志类型`: `action`
  - `事件名`: use names below

## Key Event Names
- `route_navigation_settled`
- `project_manage_edit_dialog_open`
- `project_manage_detail_dialog_open`
- `system_user_edit_dialog_open`
- `dashboard_fetch_map_summary`
- `dashboard_fetch_map_points`
- `dashboard_render_map`
- `dashboard_sync_view`
- `dashboard_map_drilldown`
- `dashboard_manual_refresh`
- `dashboard_project_detail_open`
- `dashboard_chart_setup`

## Payload Fields
- Common: `durationMs`, `thresholdMs`, `isSlow`, `perfMetric`
- Scenario fields: `mode`, `projectId`, `userId`, `level`, `trigger`, `success`
- Split stage fields: `hydrateMs`, `prepareResourcesMs`, `renderMs`, `optionsMs`, `detailMs`, `roleMs`
