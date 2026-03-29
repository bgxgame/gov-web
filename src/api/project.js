import request from '../utils/request'
import {
  buildProjectMapParams,
  buildProjectPageParams,
  buildProjectSavePayload,
  buildProjectSubmitPayload
} from '../utils/project-models'

/**
 * 项目相关 API 封装。
 * 这里既保留原始接口，也提供更贴近页面动作的组合方法。
 */

/** 按原始参数调用项目分页接口。 */
export const getProjectPage = (params, config = {}) => request.get('/project/page', { params, cancelKey: 'project:page', ...config })

/** 获取项目详情。 */
export const getProjectDetail = (id) => request.get(`/project/get/${id}`)

/** 新增项目。 */
export const addProject = (payload) => request.post('/project/add', payload)

/** 更新项目。 */
export const updateProject = (payload) => request.put('/project/update', payload)

/** 删除项目。 */
export const deleteProject = (id) => request.delete(`/project/${id}`)

/** 提交项目审批。 */
export const submitProject = (payload) => request.post('/project/submit', payload)

/** 获取地图点位列表。 */
export const getProjectMapList = (params, config = {}) =>
  request.get('/project/map/list', { params, cancelKey: 'project:map-list', ...config })

/**
 * 根据页面查询表单与分页对象查询项目列表。
 *
 * @param {Record<string, unknown>} queryForm 查询表单
 * @param {{ pageNum:number, pageSize:number }} pagination 分页对象
 * @returns {Promise<any>} 分页响应
 */
export const fetchProjectPageByForm = (queryForm, pagination, config) =>
  getProjectPage(buildProjectPageParams(queryForm, pagination), config)

/**
 * 根据项目表单自动决定走新增还是更新接口。
 *
 * @param {Record<string, unknown>} form 项目表单
 * @returns {Promise<any>} 保存响应
 */
export const saveProjectForm = (form) => {
  const payload = buildProjectSavePayload(form)
  return payload.id ? updateProject(payload) : addProject(payload)
}

/**
 * 仅按项目 ID 提交审批。
 *
 * @param {string|number} projectId 项目 ID
 * @returns {Promise<any>} 提交响应
 */
export const submitProjectById = (projectId) => submitProject(buildProjectSubmitPayload(projectId))

/**
 * 根据地图筛选条件查询项目点位。
 *
 * @param {Record<string, unknown>} filters 地图筛选条件
 * @returns {Promise<any>} 地图响应
 */
export const fetchProjectMapListByFilters = (filters, config) => getProjectMapList(buildProjectMapParams(filters), config)
