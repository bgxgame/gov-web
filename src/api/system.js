import request from '../utils/request'
import { buildAuditPageParams } from '../utils/audit-models'
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

/** 获取用户分页。*/
export const getUserPage = (params) => request.get('/system/user/page', { params })
/** 获取简版用户列表。*/
export const getUserSimple = () => request.get('/system/user/simple')
/** 新增用户。*/
export const addUser = (payload) => request.post('/system/user/add', payload)
/** 更新用户。*/
export const updateUser = (payload) => request.put('/system/user/update', payload)
/** 更新用户状态。*/
export const updateUserStatus = (payload) => request.put('/system/user/status', payload)
/** 获取指定用户角色。*/
export const getUserRoles = (id) => request.get(`/system/user/${id}/roles`)
/** 设置用户角色。*/
export const setUserRoles = (payload) => request.put('/system/user/roles', payload)

/** 获取部门树。*/
export const getDeptTree = () => request.get('/system/dept/tree')
/** 新增部门。*/
export const addDept = (payload) => request.post('/system/dept/add', payload)
/** 更新部门。*/
export const updateDept = (payload) => request.put('/system/dept/update', payload)
/** 删除部门。*/
export const deleteDept = (id) => request.delete(`/system/dept/${id}`)

/** 获取角色分页。*/
export const getRolePage = (params) => request.get('/system/role/page', { params })
/** 获取角色列表。*/
export const getRoleAll = () => request.get('/system/role/all')
/** 获取菜单权限目录。*/
export const getRoleMenuCatalog = () => request.get('/system/role/menu-catalog')
/** 新增角色。*/
export const addRole = (payload) => request.post('/system/role/add', payload)
/** 更新角色。*/
export const updateRole = (payload) => request.put('/system/role/update', payload)
/** 更新角色菜单权限。*/
export const updateRoleMenus = (id, payload) => request.put(`/system/role/${id}/menus`, payload)
/** 删除角色。*/
export const deleteRole = (id) => request.delete(`/system/role/${id}`)

/** 获取审计日志分页。*/
export const getAuditPage = (params) => request.get('/system/audit/page', { params })

/**
 * 根据用户页查询表单和分页对象获取用户列表。
 *
 * @param {Record<string, unknown>} queryForm 查询表单
 * @param {{ pageNum:number, pageSize:number }} pagination 分页对象
 * @returns {Promise<any>} 用户分页响应
 */
export const fetchUserPageByForm = (queryForm, pagination) => getUserPage(buildUserPageParams(queryForm, pagination))

/**
 * 根据用户表单自动决定走新增还是更新接口。
 *
 * @param {Record<string, unknown>} form 用户表单
 * @param {string|number|undefined} fallbackDeptId 默认部门 ID
 * @returns {Promise<any>} 保存响应
 */
export const saveUserForm = (form, fallbackDeptId) => {
  const payload = buildUserSavePayload(form, fallbackDeptId)
  return payload.id ? updateUser(payload) : addUser(payload)
}

/** 切换用户启停状态。*/
export const setUserEnabled = (id, enabled) => updateUserStatus(buildUserStatusPayload(id, enabled))

/** 根据部门表单自动决定走新增还是更新接口。*/
export const saveDeptForm = (form) => {
  const payload = buildDeptSavePayload(form)
  return payload.id ? updateDept(payload) : addDept(payload)
}

/** 根据角色查询表单和分页对象获取角色分页。*/
export const fetchRolePageByForm = (queryForm, pagination) => getRolePage(buildRolePageParams(queryForm, pagination))

/** 根据角色表单自动决定走新增还是更新接口。*/
export const saveRoleForm = (form) => {
  const payload = buildRoleSavePayload(form)
  return payload.id ? updateRole(payload) : addRole(payload)
}

/** 按角色 ID 更新菜单键集合。*/
export const updateRoleMenuKeys = (id, menuKeys) => updateRoleMenus(id, buildRoleMenuPayload(menuKeys))

/**
 * 根据审计查询表单和分页对象获取审计日志分页。
 *
 * @param {Record<string, unknown>} queryForm 查询表单
 * @param {{ pageNum:number, pageSize:number }} pagination 分页对象
 * @returns {Promise<any>} 审计分页响应
 */
export const fetchAuditPageByForm = (queryForm, pagination) => getAuditPage(buildAuditPageParams(queryForm, pagination))
