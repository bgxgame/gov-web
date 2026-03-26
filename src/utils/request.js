import axios from 'axios'
import { ElMessage } from 'element-plus'

const service = axios.create({
  baseURL: '/api',
  timeout: 10000
})

// 请求拦截：自动携带 Token
service.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers['Authorization'] = token // 必须与后端 sa-token.token-name 一致
  }
  return config
}, error => {
  return Promise.reject(error)
})

// 响应拦截：统一处理报错
service.interceptors.response.use(response => {
  const res = response.data
  if (res.code !== 200) {
    ElMessage.error(res.msg || '系统错误')
    if (res.code === 401) {
      // 登录失效，跳转回登录页
      window.location.href = '/login'
    }
    return Promise.reject(new Error(res.msg || 'Error'))
  }
  return res
}, error => {
  ElMessage.error('网络请求失败')
  return Promise.reject(error)
})

export default service