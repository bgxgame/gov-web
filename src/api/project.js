import request from '../utils/request'
import {
  buildProjectMapParams,
  buildProjectMapSummaryParams,
  buildProjectPageParams,
  buildProjectSavePayload,
  buildProjectSubmitPayload
} from '../utils/project-models'

/**
 * 项目相关 API 封装。
 */

export const getProjectPage = (params, config = {}) =>
  request.get('/project/page', { params, cancelKey: 'project:page', ...config })

export const getProjectDetail = (id) => request.get(`/project/get/${id}`)

export const addProject = (payload) => request.post('/project/add', payload)

export const updateProject = (payload) => request.put('/project/update', payload)

export const deleteProject = (id) => request.delete(`/project/${id}`)

export const submitProject = (payload) => request.post('/project/submit', payload)

export const getProjectMapList = (params, config = {}) =>
  request.get('/project/map/list', { params, cancelKey: 'project:map-list', ...config })

export const getProjectMapSummary = (params, config = {}) =>
  request.get('/project/map/summary', { params, cancelKey: 'project:map-summary', ...config })

export const fetchProjectPageByForm = (queryForm, pagination, config) =>
  getProjectPage(buildProjectPageParams(queryForm, pagination), config)

export const saveProjectForm = (form) => {
  const payload = buildProjectSavePayload(form)
  return payload.id ? updateProject(payload) : addProject(payload)
}

export const submitProjectById = (projectId) => submitProject(buildProjectSubmitPayload(projectId))

export const fetchProjectMapListByFilters = (filters, config) =>
  getProjectMapList(buildProjectMapParams(filters), config)

export const fetchProjectMapSummaryByFilters = (level, filters, config) =>
  getProjectMapSummary(buildProjectMapSummaryParams(level, filters), config)
