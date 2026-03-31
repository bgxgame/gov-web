import { appConfig } from '../config/app-config'

function normalizeMenuKey(menuKey) {
  return String(menuKey || '').trim()
}

/**
 * 作用：判断某个菜单功能在当前环境是否启用。
 * 说明：这里只负责环境开关，不负责用户权限校验。
 */
export function isMenuEnabled(menuKey) {
  const normalizedMenuKey = normalizeMenuKey(menuKey)
  if (!normalizedMenuKey) return false
  return !appConfig.hiddenMenuKeys.includes(normalizedMenuKey)
}

/**
 * 作用：过滤出当前环境可用的菜单键集合。
 * 说明：用于统一处理菜单展示、默认首页和路由守卫，避免各处各写一份判断。
 */
export function filterEnabledMenuKeys(menuKeys) {
  if (!Array.isArray(menuKeys)) return []
  return [...new Set(
    menuKeys
      .map((item) => normalizeMenuKey(item))
      .filter((item) => item && isMenuEnabled(item))
  )]
}
