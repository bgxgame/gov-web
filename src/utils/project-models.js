/**
 * @typedef {Object} ProjectUserOption
 * @property {string|number} id
 * @property {string} [username]
 * @property {string} [realName]
 * @property {string} [phone]
 */

/**
 * @typedef {Object} ProjectFormModel
 * 本地可编辑的项目表单模型。
 * 字段名尽量与后端 `ProjectCreateDTO`、`ProjectUpdateDTO`
 * 和 `ProjectDetailVO` 的公共字段保持一致。
 *
 * @property {string|undefined} id
 * @property {string} projectName
 * @property {string} projectCode
 * @property {string} address
 * @property {string} province
 * @property {string} city
 * @property {string} district
 * @property {string|number|null} longitude
 * @property {string|number|null} latitude
 * @property {string|number|undefined} leaderUserId
 * @property {string} leaderName
 * @property {string} leaderPhone
 * @property {string} description
 * @property {number} status
 * @property {string|number|undefined} creatorDeptId
 * @property {ProjectAttachmentModel[]} attachments
 */

/**
 * @typedef {Object} ProjectAttachmentModel
 * @property {string|number|undefined} id
 * @property {string} fileName
 * @property {string} fileType
 * @property {number} fileSize
 * @property {boolean} isImage
 * @property {string} accessUrl
 */

/**
 * 统一裁剪文本类输入，并把空值折叠为 `undefined`，
 * 避免查询参数和提交载荷带上无意义空字符串。
 *
 * @param {unknown} value
 * @returns {string|undefined}
 */
function normalizeOptionalText(value) {
  const text = String(value ?? '').trim()
  return text ? text : undefined
}

/**
 * 将表单中的坐标输入标准化为数字或 `null`。
 *
 * @param {unknown} value
 * @returns {number|null}
 */
function normalizeCoordinate(value) {
  const text = String(value ?? '').trim()
  if (!text) return null
  const numeric = Number(text)
  return Number.isFinite(numeric) ? numeric : null
}

function validateCoordinateValue(value, label, min, max) {
  const text = String(value ?? '').trim()
  if (!text) return null

  const numeric = Number(text)
  if (!Number.isFinite(numeric)) {
    return `${label}必须是数字`
  }
  if (numeric < min || numeric > max) {
    return `${label}范围应为 ${min} 到 ${max}`
  }
  return null
}

export function validateProjectCoordinates(form) {
  return (
    validateCoordinateValue(form?.longitude, '经度', -180, 180) ||
    validateCoordinateValue(form?.latitude, '纬度', -90, 90)
  )
}

export function normalizeAttachmentAccessUrl(value) {
  const rawUrl = String(value || '').trim()
  if (!rawUrl) return ''
  if (typeof window === 'undefined' || typeof URL === 'undefined') {
    return rawUrl
  }

  try {
    const resolvedUrl = new URL(rawUrl, window.location.origin)
    if (!resolvedUrl.pathname.startsWith('/minio/')) {
      return resolvedUrl.toString()
    }
    return `${window.location.origin}${resolvedUrl.pathname}${resolvedUrl.search}${resolvedUrl.hash}`
  } catch (error) {
    return rawUrl
  }
}

/**
 * 将单个附件结构规整为页面内部统一模型。
 *
 * @param {Record<string, unknown>|null|undefined} file
 * @returns {ProjectAttachmentModel|null}
 */
function normalizeProjectAttachment(file) {
  const rawId = file?.id
  if (rawId === undefined || rawId === null || rawId === '') return null

  const numericSize = Number(file?.fileSize ?? 0)
  return {
    id: rawId,
    fileName: String(file?.fileName || '未命名附件'),
    fileType: String(file?.fileType || ''),
    fileSize: Number.isFinite(numericSize) ? numericSize : 0,
    isImage: Boolean(file?.isImage ?? file?.image),
    accessUrl: normalizeAttachmentAccessUrl(file?.accessUrl)
  }
}

/**
 * 统一规整附件列表，顺带过滤空项。
 *
 * @param {unknown[]} files
 * @returns {ProjectAttachmentModel[]}
 */
function normalizeProjectAttachmentList(files) {
  if (!Array.isArray(files)) return []
  return files.map((item) => normalizeProjectAttachment(item)).filter(Boolean)
}

/**
 * 创建页面使用的默认项目表单结构。
 *
 * @returns {ProjectFormModel}
 */
export function createEmptyProjectForm() {
  return {
    id: undefined,
    projectName: '',
    projectCode: '',
    address: '',
    province: '',
    city: '',
    district: '',
    longitude: '',
    latitude: '',
    leaderUserId: undefined,
    leaderName: '',
    leaderPhone: '',
    description: '',
    status: 0,
    creatorDeptId: undefined,
    attachments: []
  }
}

/**
 * 将接口详情或列表数据标准化为本地弹窗表单结构。
 * 同时会尽量根据当前缓存的用户选项回推 `leaderUserId`。
 *
 * @param {Partial<ProjectFormModel>|null|undefined} project
 * @param {ProjectUserOption[]} [userOptions=[]]
 * @returns {ProjectFormModel}
 */
export function normalizeProjectForm(project, userOptions = []) {
  if (!project) return createEmptyProjectForm()
  const matchedUser = userOptions.find(
    (item) =>
      String(item.id) === String(project.leaderUserId || '') ||
      (project.leaderName && (item.realName === project.leaderName || item.username === project.leaderName)) ||
      (project.leaderPhone && item.phone === project.leaderPhone)
  )

  return {
    id: project.id ? String(project.id) : undefined,
    projectName: project.projectName || '',
    projectCode: project.projectCode || '',
    address: project.address || '',
    province: project.province || '',
    city: project.city || '',
    district: project.district || '',
    longitude: project.longitude ?? '',
    latitude: project.latitude ?? '',
    leaderUserId: matchedUser?.id,
    leaderName: project.leaderName || '',
    leaderPhone: project.leaderPhone || '',
    description: project.description || '',
    status: project.status ?? 0,
    creatorDeptId: project.creatorDeptId,
    attachments: normalizeProjectAttachmentList(project.attachments)
  }
}

/**
 * 构建 `/project/page` 所需的查询参数。
 * 返回字段与后端分页筛选参数保持一致。
 *
 * @param {{ projectName?: string, status?: number, province?: string, city?: string, district?: string }} queryForm
 * @param {{ pageNum: number, pageSize: number }} pagination
 * @returns {{ pageNum: number, pageSize: number, projectName?: string, status?: number, province?: string, city?: string, district?: string }}
 */
export function buildProjectPageParams(queryForm, pagination) {
  return {
    pageNum: pagination.pageNum,
    pageSize: pagination.pageSize,
    projectName: normalizeOptionalText(queryForm.projectName),
    status: queryForm.status,
    province: normalizeOptionalText(queryForm.province),
    city: normalizeOptionalText(queryForm.city),
    district: normalizeOptionalText(queryForm.district)
  }
}

/**
 * 构建 `/project/map/list` 所需的查询参数。
 *
 * @param {{ province?: string, city?: string, district?: string }|undefined} filters
 * @returns {{ province?: string, city?: string, district?: string }}
 */
export function buildProjectMapParams(filters) {
  return {
    province: normalizeOptionalText(filters?.province),
    city: normalizeOptionalText(filters?.city),
    district: normalizeOptionalText(filters?.district)
  }
}

/**
 * 构建 `/project/map/summary` 所需的查询参数。
 *
 * @param {'city'|'district'|string|undefined} level
 * @param {{ province?: string, city?: string, district?: string }|undefined} filters
 * @returns {{ level?: string, province?: string, city?: string, district?: string }}
 */
export function buildProjectMapSummaryParams(level, filters) {
  const normalizedLevel = String(level || '').trim()
  return {
    level: normalizedLevel || undefined,
    province: normalizeOptionalText(filters?.province),
    city: normalizeOptionalText(filters?.city),
    district: normalizeOptionalText(filters?.district)
  }
}

/**
 * 将可编辑项目表单转换为创建或更新接口所需的提交载荷。
 * 这里返回的是前端侧维护的后端 DTO 子集。
 *
 * @param {ProjectFormModel} form
 * @returns {Record<string, unknown>}
 */
export function buildProjectSavePayload(form) {
  const payload = {
    projectName: String(form.projectName || '').trim(),
    projectCode: normalizeOptionalText(form.projectCode),
    address: normalizeOptionalText(form.address),
    province: normalizeOptionalText(form.province),
    city: normalizeOptionalText(form.city),
    district: normalizeOptionalText(form.district),
    longitude: normalizeCoordinate(form.longitude),
    latitude: normalizeCoordinate(form.latitude),
    leaderUserId: form.leaderUserId,
    leaderName: normalizeOptionalText(form.leaderName),
    leaderPhone: normalizeOptionalText(form.leaderPhone),
    description: normalizeOptionalText(form.description),
    status: form.status,
    creatorDeptId: form.creatorDeptId,
    attachments: normalizeProjectAttachmentList(form.attachments).map((item) => ({ id: item.id }))
  }
  if (form.id !== undefined && form.id !== null && form.id !== '') {
    payload.id = form.id
  }
  return payload
}

/**
 * 构建后端 `ProjectSubmitDTO` 所需的最小提交载荷。
 *
 * @param {string|number|undefined|null} projectId
 * @returns {{ id: string|number|undefined|null }}
 */
export function buildProjectSubmitPayload(projectId) {
  return {
    id: projectId
  }
}
