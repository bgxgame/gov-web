import request from '../utils/request'

export const getUserPage = (params) => request.get('/system/user/page', { params })
export const getUserSimple = () => request.get('/system/user/simple')
export const addUser = (payload) => request.post('/system/user/add', payload)
export const updateUser = (payload) => request.put('/system/user/update', payload)
export const updateUserStatus = (payload) => request.put('/system/user/status', payload)
export const getUserRoles = (id) => request.get(`/system/user/${id}/roles`)
export const setUserRoles = (payload) => request.put('/system/user/roles', payload)

export const getDeptTree = () => request.get('/system/dept/tree')
export const addDept = (payload) => request.post('/system/dept/add', payload)
export const updateDept = (payload) => request.put('/system/dept/update', payload)
export const deleteDept = (id) => request.delete(`/system/dept/${id}`)

export const getRolePage = (params) => request.get('/system/role/page', { params })
export const getRoleAll = () => request.get('/system/role/all')
export const addRole = (payload) => request.post('/system/role/add', payload)
export const updateRole = (payload) => request.put('/system/role/update', payload)
export const deleteRole = (id) => request.delete(`/system/role/${id}`)
