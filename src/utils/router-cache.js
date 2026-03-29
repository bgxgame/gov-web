/**
 * 职责：
 * 定义布局层页面缓存策略，决定哪些核心业务页在菜单切换时保留实例。
 *
 * 为什么存在：
 * 避免每次切换菜单都销毁并重建页面，减少重复请求和首屏重算，提升切页体感。
 *
 * 关键输入输出：
 * 输入为路由对象；
 * 输出为当前路由是否启用 keep-alive。
 *
 * 关联链路：
 * 主布局 router-view -> keep-alive -> 各业务页面切换。
 */
export const CACHEABLE_VIEW_NAMES = [
  'Dashboard',
  'ProjectManage',
  'EngineeringManage',
  'UserManage',
  'DeptManage',
  'RoleManage',
  'AuditManage',
  'FrontendMonitorManage'
]

/**
 * 作用：
 * 根据路由元信息判断当前页面是否应该进入缓存。
 */
export function shouldKeepAliveRoute(route) {
  const routeName = String(route?.name || '')
  if (!routeName) return false
  return Boolean(route?.meta?.keepAlive) && CACHEABLE_VIEW_NAMES.includes(routeName)
}
