/**
 * @typedef {Object} DeptTreeNode
 * @property {string|number} id
 * @property {string} deptName
 * @property {DeptTreeNode[]} [children]
 */

/**
 * @typedef {Object} DeptOption
 * @property {string|number} id
 * @property {string} label
 */

/**
 * @typedef {Object} DeptFormModel
 * Local department dialog model.
 * Field names stay aligned with backend
 * `DeptCreateDTO` / `DeptUpdateDTO` subset.
 *
 * @property {string|number|undefined} id
 * @property {string|number} parentId
 * @property {string} deptName
 * @property {string|number|undefined} leaderId
 */

/**
 * @typedef {Object} UserFormModel
 * Local user dialog model.
 * Field names stay aligned with the backend
 * `UserCreateDTO` / `UserUpdateDTO` subset.
 *
 * @property {string|number|undefined} id
 * @property {string} username
 * @property {string} realName
 * @property {string|number|undefined} deptId
 * @property {string} phone
 * @property {number} status
 * @property {Array<string|number>} roleIds
 * @property {string} password
 */

/**
 * @typedef {Object} RoleFormModel
 * Local role dialog model.
 * Field names stay aligned with backend `RoleCreateDTO`
 * and `RoleUpdateDTO` subset used by the basic role dialog.
 *
 * @property {string|number|undefined} id
 * @property {string} roleName
 */

/**
 * Normalize optional text fields before sending them as params/payloads.
 *
 * @param {unknown} value
 * @returns {string|undefined}
 */
function normalizeOptionalText(value) {
  const text = String(value ?? '').trim()
  return text ? text : undefined
}

/**
 * Flatten the nested department tree into select options used by dialogs.
 *
 * @param {DeptTreeNode[]} list
 * @param {string} [prefix='']
 * @returns {DeptOption[]}
 */
export function flattenDeptOptions(list, prefix = '') {
  const result = []
  ;(list || []).forEach((item) => {
    const label = prefix ? `${prefix} / ${item.deptName}` : item.deptName
    result.push({ id: item.id, label })
    if (item.children && item.children.length > 0) {
      result.push(...flattenDeptOptions(item.children, label))
    }
  })
  return result
}

/**
 * Create the default user dialog form.
 *
 * @param {string|number|undefined} defaultDeptId
 * @returns {UserFormModel}
 */
export function createEmptyUserForm(defaultDeptId) {
  return {
    id: undefined,
    username: '',
    realName: '',
    deptId: defaultDeptId,
    phone: '',
    status: 1,
    roleIds: [],
    password: ''
  }
}

/**
 * Create the default department dialog form.
 *
 * @returns {DeptFormModel}
 */
export function createEmptyDeptForm() {
  return {
    id: undefined,
    parentId: 0,
    deptName: '',
    leaderId: undefined
  }
}

/**
 * Normalize a user row from the table into the local edit form shape.
 *
 * @param {Record<string, any>} row
 * @returns {UserFormModel}
 */
export function normalizeUserForm(row) {
  return {
    id: row.id,
    username: row.username || '',
    realName: row.realName || '',
    deptId: row.deptId,
    phone: row.phone || '',
    status: Number(row.status) === 1 ? 1 : 0,
    roleIds: [],
    password: ''
  }
}

/**
 * Normalize a department row into the local edit form shape.
 *
 * @param {Record<string, any>} row
 * @returns {DeptFormModel}
 */
export function normalizeDeptForm(row) {
  return {
    id: row.id,
    parentId: row.parentId || 0,
    deptName: row.deptName || '',
    leaderId: row.leaderId
  }
}

/**
 * Build query params for `/system/user/page`.
 * The returned keys match backend user page filters.
 *
 * @param {{ username?: string, realName?: string, status?: number }} queryForm
 * @param {{ pageNum: number, pageSize: number }} pagination
 * @returns {{ pageNum: number, pageSize: number, username?: string, realName?: string, status?: number }}
 */
export function buildUserPageParams(queryForm, pagination) {
  return {
    pageNum: pagination.pageNum,
    pageSize: pagination.pageSize,
    username: normalizeOptionalText(queryForm.username),
    realName: normalizeOptionalText(queryForm.realName),
    status: queryForm.status
  }
}

/**
 * Convert the user dialog form into the payload accepted by create/update APIs.
 * The payload is a frontend subset of backend
 * `UserCreateDTO` / `UserUpdateDTO`.
 *
 * @param {UserFormModel} form
 * @param {string|number|undefined} fallbackDeptId
 * @returns {Record<string, unknown>}
 */
export function buildUserSavePayload(form, fallbackDeptId) {
  const payload = {
    realName: normalizeOptionalText(form.realName),
    deptId: form.deptId,
    phone: normalizeOptionalText(form.phone),
    status: form.status,
    roleIds: Array.isArray(form.roleIds) ? form.roleIds.filter((item) => item !== null && item !== undefined) : [],
    password: normalizeOptionalText(form.password)
  }
  if (!payload.deptId && fallbackDeptId) {
    payload.deptId = fallbackDeptId
  }
  if (form.id !== undefined && form.id !== null && form.id !== '') {
    payload.id = form.id
  } else {
    payload.username = normalizeOptionalText(form.username)
  }
  return payload
}

/**
 * Build the payload used by backend `UserStatusUpdateDTO`.
 *
 * @param {string|number} id
 * @param {boolean} enabled
 * @returns {{ id: string|number, status: number }}
 */
export function buildUserStatusPayload(id, enabled) {
  return {
    id,
    status: enabled ? 1 : 0
  }
}

/**
 * Create the default role dialog form.
 *
 * @returns {RoleFormModel}
 */
export function createEmptyRoleForm() {
  return {
    id: undefined,
    roleName: ''
  }
}

/**
 * Normalize a role row from the table into the local edit form shape.
 *
 * @param {Record<string, any>} row
 * @returns {RoleFormModel}
 */
export function normalizeRoleForm(row) {
  return {
    id: row.id,
    roleName: row.roleName || ''
  }
}

/**
 * Build query params for `/system/role/page`.
 * The returned keys match backend role page filters.
 *
 * @param {{ roleName?: string }} queryForm
 * @param {{ pageNum: number, pageSize: number }} pagination
 * @returns {{ pageNum: number, pageSize: number, roleName?: string }}
 */
export function buildRolePageParams(queryForm, pagination) {
  return {
    pageNum: pagination.pageNum,
    pageSize: pagination.pageSize,
    roleName: normalizeOptionalText(queryForm.roleName)
  }
}

/**
 * Convert the role dialog form into the payload used by
 * backend `RoleCreateDTO` / `RoleUpdateDTO`.
 *
 * @param {RoleFormModel} form
 * @returns {{ id?: string|number, roleName: string|undefined }}
 */
export function buildRoleSavePayload(form) {
  const payload = {
    roleName: normalizeOptionalText(form.roleName)
  }
  if (form.id !== undefined && form.id !== null && form.id !== '') {
    payload.id = form.id
  }
  return payload
}

/**
 * Build the payload used by backend role menu assignment API.
 *
 * @param {Array<string>} menuKeys
 * @returns {{ menuKeys: string[] }}
 */
export function buildRoleMenuPayload(menuKeys) {
  return {
    menuKeys: Array.isArray(menuKeys) ? menuKeys.filter(Boolean) : []
  }
}

/**
 * Convert the department dialog form into the payload accepted by
 * backend `DeptCreateDTO` / `DeptUpdateDTO`.
 *
 * @param {DeptFormModel} form
 * @returns {{ id?: string|number, parentId: string|number, deptName: string|undefined, leaderId: string|number|undefined }}
 */
export function buildDeptSavePayload(form) {
  const payload = {
    parentId: form.parentId ?? 0,
    deptName: normalizeOptionalText(form.deptName),
    leaderId: form.leaderId
  }
  if (form.id !== undefined && form.id !== null && form.id !== '') {
    payload.id = form.id
  }
  return payload
}

/**
 * Split backend menu permission strings into checkbox-friendly arrays.
 *
 * @param {string|undefined|null} menuPerms
 * @returns {string[]}
 */
export function splitMenuPerms(menuPerms) {
  if (!menuPerms) return []
  return String(menuPerms)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}
