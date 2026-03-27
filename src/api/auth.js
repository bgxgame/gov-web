import request from '../utils/request'

export const login = (payload) => request.post('/system/login', payload)

export const logout = () => request.post('/system/logout')
