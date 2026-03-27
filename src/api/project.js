import request from '../utils/request'

export const getProjectPage = (params) => request.get('/project/page', { params })

export const getProjectDetail = (id) => request.get(`/project/get/${id}`)

export const addProject = (payload) => request.post('/project/add', payload)

export const updateProject = (payload) => request.put('/project/update', payload)

export const deleteProject = (id) => request.delete(`/project/${id}`)

export const submitProject = (payload) => request.post('/project/submit', payload)

export const getProjectMapList = (params) => request.get('/project/map/list', { params })
