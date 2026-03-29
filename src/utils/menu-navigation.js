/**
 * 职责：把菜单组件抛出的索引值标准化成真实可导航的路由路径。
 * 为什么存在：`el-sub-menu` 的父级索引常常只是分组标识，不应该直接参与路由跳转。
 * 关键输入输出：输入为菜单索引；输出为以 `/` 开头的路由路径或空字符串。
 * 关联链路：登录后主布局菜单点击、页面切换、避免误跳首页。
 */
export function resolveMenuTargetPath(index) {
  const targetPath = typeof index === 'string' ? index.trim() : ''
  return targetPath.startsWith('/') ? targetPath : ''
}
