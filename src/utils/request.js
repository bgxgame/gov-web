import axios from 'axios'
import { ElMessage } from 'element-plus'

const service = axios.create({
  baseURL: '/api',
  timeout: 10000
})

let redirectedBy401 = false

service.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = token
    }
    return config
  },
  (error) => Promise.reject(error)
)

service.interceptors.response.use(
  (response) => {
    const res = response.data
    if (res.code !== 200) {
      if (res.code === 401) {
        localStorage.removeItem('token')
        localStorage.removeItem('user_info')
        if (!redirectedBy401) {
          redirectedBy401 = true
          ElMessage.error(res.msg || '登录已失效，请重新登录')
          if (window.location.pathname !== '/login') {
            window.location.replace('/login')
          }
          setTimeout(() => {
            redirectedBy401 = false
          }, 800)
        }
      } else {
        ElMessage.error(res.msg || '系统错误')
      }
      return Promise.reject(new Error(res.msg || 'Error'))
    }
    return res
  },
  (error) => {
    ElMessage.error('网络请求失败')
    return Promise.reject(error)
  }
)

export default service
