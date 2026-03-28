/**
 * @typedef {Object} ProjectUserOption
 * @property {string|number} id
 * @property {string} [username]
 * @property {string} [realName]
 * @property {string} [phone]
 */

/**
 * @typedef {Object} ProjectFormModel
 * Local editable form model.
 * Field names intentionally stay aligned with the backend
 * `ProjectCreateDTO`, `ProjectUpdateDTO` and `ProjectDetailVO` subset.
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
 */

/**
 * Trim text-like input and collapse empty values to `undefined`
 * so query params and payloads do not send meaningless blanks.
 *
 * @param {unknown} value
 * @returns {string|undefined}
 */
function normalizeOptionalText(value) {
  const text = String(value ?? '').trim()
  return text ? text : undefined
}

/**
 * Convert loose form coordinate input into a number or `null`.
 *
 * @param {unknown} value
 * @returns {number|null}
 */
function normalizeCoordinate(value) {
  if (value === '' || value === null || value === undefined) return null
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

/**
 * Create the default editable project form shape used by the page.
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
    creatorDeptId: undefined
  }
}

/**
 * Normalize API detail/list data into the local dialog form shape.
 * The helper also tries to infer `leaderUserId` from the cached user list.
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
    creatorDeptId: project.creatorDeptId
  }
}

/**
 * Build the page query object expected by `/project/page`.
 * The returned keys stay aligned with backend `ProjectPageVO` filters.
 *
 * @param {{ projectName?: string, status?: number, province?: string }} queryForm
 * @param {{ pageNum: number, pageSize: number }} pagination
 * @returns {{ pageNum: number, pageSize: number, projectName?: string, status?: number, province?: string }}
 */
export function buildProjectPageParams(queryForm, pagination) {
  return {
    pageNum: pagination.pageNum,
    pageSize: pagination.pageSize,
    projectName: normalizeOptionalText(queryForm.projectName),
    status: queryForm.status,
    province: normalizeOptionalText(queryForm.province)
  }
}

/**
 * Build query params for `/project/map/list`.
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
 * Convert the editable project form into the payload shape expected by
 * create/update project APIs.
 * The payload is a frontend subset of backend `ProjectCreateDTO`
 * and `ProjectUpdateDTO`.
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
    creatorDeptId: form.creatorDeptId
  }
  if (form.id !== undefined && form.id !== null && form.id !== '') {
    payload.id = form.id
  }
  return payload
}

/**
 * Build the minimal payload expected by backend `ProjectSubmitDTO`.
 *
 * @param {string|number|undefined|null} projectId
 * @returns {{ id: string|number|undefined|null }}
 */
export function buildProjectSubmitPayload(projectId) {
  return {
    id: projectId
  }
}
