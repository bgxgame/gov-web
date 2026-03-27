import request from '../utils/request'

export const getTodoList = () => request.get('/flow/todo')

export const getDoneList = () => request.get('/flow/done')

export const approveTask = (payload) => request.post('/flow/approve', payload)
