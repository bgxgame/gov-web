import request from '../utils/request'
import { buildAuditPageParams } from '../utils/audit-models'
import { buildFrontendMonitorPageParams } from '../utils/frontend-monitor-models'
import {
  buildDeptSavePayload,
  buildRoleMenuPayload,
  buildRolePageParams,
  buildRoleSavePayload,
  buildUserPageParams,
  buildUserSavePayload,
  buildUserStatusPayload
} from '../utils/system-models'

/**
 * 职责：统一封装系统管理相关接口（用户、部门、角色、审计）。
 * 为什么存在：避免页面散落拼接 URL 和参数，统一请求契约与参数规范化。
 * 关键输入输出：输入为页面表单/分页对象，输出为后端 `R` 包装响应。
 * 关联链路：系统管理各页面。
 */

const optionCache = new Map()
const optionPromiseCache = new Map()

function getCachedOption(key, requestFactory) {
  if (optionCache.has(key)) {
    return Promise.resolve(optionCache.get(key))
  }
  if (optionPromiseCache.has(key)) {
    return optionPromiseCache.get(key)
  }

  const requestPromise = Promise.resolve()
    .then(() => requestFactory())
    .then((response) => {
      optionCache.set(key, response)
      optionPromiseCache.delete(key)
      return response
    })
    .catch((error) => {
      optionPromiseCache.delete(key)
      throw error
    })

  optionPromiseCache.set(key, requestPromise)
  return requestPromise
}

function invalidateOptionCache(...keys) {
  keys.forEach((key) => {
    optionCache.delete(key)
    optionPromiseCache.delete(key)
  })
}

/** 获取用户分页。*/
export const getUserPage = (params, config = {}) =>
  request.get('/system/user/page', { params, cancelKey: 'system:user-page', ...config })
/** 获取简版用户列表。*/
export const getUserSimple = () => getCachedOption('userSimple', () => request.get('/system/user/simple'))
/** 新增用户。*/
export const addUser = (payload) => request.post('/system/user/add', payload)
/** 更新用户。*/
export const updateUser = (payload) => request.put('/system/user/update', payload)
/** 更新用户状态。*/
export const updateUserStatus = (payload) => request.put('/system/user/status', payload)
/** 获取指定用户角色。*/
export const getUserRoles = (id) => request.get(`/system/user/${id}/roles`)
/** 设置用户角色。*/
export const setUserRoles = (payload) =>
  request.put('/system/user/roles', payload).then((response) => {
    invalidateOptionCache('userSimple')
    return response
  })

/** 获取部门树。*/
export const getDeptTree = () => getCachedOption('deptTree', () => request.get('/system/dept/tree'))
/** 新增部门。*/
export const addDept = (payload) => request.post('/system/dept/add', payload)
/** 更新部门。*/
export const updateDept = (payload) => request.put('/system/dept/update', payload)
/** 删除部门。*/
export const deleteDept = (id) =>
  request.delete(`/system/dept/${id}`).then((response) => {
    invalidateOptionCache('deptTree')
    return response
  })

/** 获取角色分页。*/
export const getRolePage = (params, config = {}) =>
  request.get('/system/role/page', { params, cancelKey: 'system:role-page', ...config })
/** 获取角色列表。*/
export const getRoleAll = () => getCachedOption('roleAll', () => request.get('/system/role/all'))
/** 获取菜单权限目录。*/
export const getRoleMenuCatalog = () => getCachedOption('roleMenuCatalog', () => request.get('/system/role/menu-catalog'))
/** 新增角色。*/
export const addRole = (payload) => request.post('/system/role/add', payload)
/** 更新角色。*/
export const updateRole = (payload) => request.put('/system/role/update', payload)
/** 更新角色菜单权限。*/
export const updateRoleMenus = (id, payload) => request.put(`/system/role/${id}/menus`, payload)
/** 删除角色。*/
export const deleteRole = (id) =>
  request.delete(`/system/role/${id}`).then((response) => {
    invalidateOptionCache('roleAll')
    return response
  })

/** 获取审计日志分页。*/
export const getAuditPage = (params, config = {}) =>
  request.get('/system/audit/page', { params, cancelKey: 'system:audit-page', ...config })

/** 获取前端监控分页。*/
export const getFrontendMonitorPage = (params, config = {}) =>
  request.get('/system/frontend-monitor/page', { params, cancelKey: 'system:frontend-monitor-page', ...config })

/**
 * 根据用户页查询表单和分页对象获取用户列表。
 *
 * @param {Record<string, unknown>} queryForm 查询表单
 * @param {{ pageNum:number, pageSize:number }} pagination 分页对象
 * @returns {Promise<any>} 用户分页响应
 */
export const fetchUserPageByForm = (queryForm, pagination, config) =>
  getUserPage(buildUserPageParams(queryForm, pagination), config)

/**
 * 根据用户表单自动决定走新增还是更新接口。
 *
 * @param {Record<string, unknown>} form 用户表单
 * @param {string|number|undefined} fallbackDeptId 默认部门 ID
 * @returns {Promise<any>} 保存响应
 */
export const saveUserForm = (form, fallbackDeptId) => {
  const payload = buildUserSavePayload(form, fallbackDeptId)
  const requestPromise = payload.id ? updateUser(payload) : addUser(payload)
  return requestPromise.then((response) => {
    invalidateOptionCache('userSimple')
    return response
  })
}

/** 切换用户启停状态。*/
export const setUserEnabled = (id, enabled) =>
  updateUserStatus(buildUserStatusPayload(id, enabled)).then((response) => {
    invalidateOptionCache('userSimple')
    return response
  })

/** 根据部门表单自动决定走新增还是更新接口。*/
export const saveDeptForm = (form) => {
  const payload = buildDeptSavePayload(form)
  const requestPromise = payload.id ? updateDept(payload) : addDept(payload)
  return requestPromise.then((response) => {
    invalidateOptionCache('deptTree')
    return response
  })
}

/** 根据角色查询表单和分页对象获取角色分页。*/
export const fetchRolePageByForm = (queryForm, pagination, config) =>
  getRolePage(buildRolePageParams(queryForm, pagination), config)

/** 根据角色表单自动决定走新增还是更新接口。*/
export const saveRoleForm = (form) => {
  const payload = buildRoleSavePayload(form)
  const requestPromise = payload.id ? updateRole(payload) : addRole(payload)
  return requestPromise.then((response) => {
    invalidateOptionCache('roleAll')
    return response
  })
}

/** 按角色 ID 更新菜单键集合。*/
export const updateRoleMenuKeys = (id, menuKeys) =>
  updateRoleMenus(id, buildRoleMenuPayload(menuKeys)).then((response) => {
    invalidateOptionCache('roleAll', 'roleMenuCatalog')
    return response
  })

/**
 * 根据审计查询表单和分页对象获取审计日志分页。
 *
 * @param {Record<string, unknown>} queryForm 查询表单
 * @param {{ pageNum:number, pageSize:number }} pagination 分页对象
 * @returns {Promise<any>} 审计分页响应
 */
export const fetchAuditPageByForm = (queryForm, pagination, config) =>
  getAuditPage(buildAuditPageParams(queryForm, pagination), config)

/**
 * 根据前端监控查询表单和分页对象获取监控分页。
 *
 * @param {Record<string, unknown>} queryForm 查询表单
 * @param {{ pageNum:number, pageSize:number }} pagination 分页对象
 * @returns {Promise<any>} 前端监控分页响应
 */
export const fetchFrontendMonitorPageByForm = (queryForm, pagination, config) =>
  getFrontendMonitorPage(buildFrontendMonitorPageParams(queryForm, pagination), config)
