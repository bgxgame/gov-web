import request from '../utils/request'
import {
  buildProjectMapParams,
  buildProjectMapSummaryParams,
  buildProjectPageParams,
  buildProjectSavePayload,
  buildProjectSubmitPayload
} from '../utils/project-models'

/**
 * 职责：统一封装项目相关接口，并对高频详情请求做轻量缓存。
 * 为什么存在：项目列表、项目详情、地图点位会被多个页面反复调用，
 * 统一在 API 层做去重和失效控制，能减少重复网络等待。
 */

const projectDetailCache = new Map()
const projectDetailPromiseCache = new Map()
const PROJECT_DETAIL_CACHE_TTL = 5 * 60 * 1000

function normalizeProjectId(id) {
  const value = String(id || '').trim()
  return value || ''
}

function getCachedProjectDetail(projectId) {
  const cachedEntry = projectDetailCache.get(projectId)
  if (!cachedEntry) return null
  if (Date.now() - cachedEntry.cachedAt > PROJECT_DETAIL_CACHE_TTL) {
    projectDetailCache.delete(projectId)
    return null
  }
  return cachedEntry.response
}

function invalidateProjectDetailCache(...ids) {
  const normalizedIds = ids.map((item) => normalizeProjectId(item)).filter(Boolean)
  if (normalizedIds.length === 0) {
    projectDetailCache.clear()
    projectDetailPromiseCache.clear()
    return
  }
  normalizedIds.forEach((id) => {
    projectDetailCache.delete(id)
    projectDetailPromiseCache.delete(id)
  })
}

export const getProjectPage = (params, config = {}) =>
  request.get('/project/page', { params, cancelKey: 'project:page', ...config })

/**
 * 获取项目详情。
 * 默认会复用已完成结果和进行中的请求，减少用户连续点击同一项目时的等待。
 */
export const getProjectDetail = (id, config = {}) => {
  const projectId = normalizeProjectId(id)
  if (!projectId) {
    return Promise.reject(new Error('项目ID不能为空'))
  }

  const { forceRefresh = false, ...requestConfig } = config
  if (!forceRefresh) {
    const cachedResponse = getCachedProjectDetail(projectId)
    if (cachedResponse) {
      return Promise.resolve(cachedResponse)
    }
  }
  if (!forceRefresh && projectDetailPromiseCache.has(projectId)) {
    return projectDetailPromiseCache.get(projectId)
  }

  const requestPromise = request
    .get(`/project/get/${projectId}`, {
      cancelKey: `project:detail:${projectId}`,
      ...requestConfig
    })
    .then((response) => {
      projectDetailCache.set(projectId, {
        response,
        cachedAt: Date.now()
      })
      return response
    })
    .finally(() => {
      projectDetailPromiseCache.delete(projectId)
    })

  projectDetailPromiseCache.set(projectId, requestPromise)
  return requestPromise
}

export const addProject = (payload) => request.post('/project/add', payload)

export const uploadProjectAttachment = (file, options = {}) => {
  const { onProgress } = options
  const formData = new FormData()
  formData.append('file', file)
  return request.post('/project/file/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    onUploadProgress: typeof onProgress === 'function'
      ? (event) => {
          if (!event?.total) return
          const percent = Math.min(100, Math.round((event.loaded / event.total) * 100))
          onProgress(percent, event)
        }
      : undefined
  })
}

export const cleanupProjectTempAttachments = (fileIds) =>
  request.post('/project/file/cleanup-temp', {
    fileIds: Array.isArray(fileIds) ? fileIds : []
  })

export const updateProject = (payload) =>
  request.put('/project/update', payload).then((response) => {
    invalidateProjectDetailCache(payload?.id)
    return response
  })

export const deleteProject = (id) =>
  request.delete(`/project/${id}`).then((response) => {
    invalidateProjectDetailCache(id)
    return response
  })

export const submitProject = (payload) =>
  request.post('/project/submit', payload).then((response) => {
    invalidateProjectDetailCache(payload?.id)
    return response
  })

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

export { invalidateProjectDetailCache }
