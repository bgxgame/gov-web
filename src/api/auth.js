import request from '../utils/request'

/**
 * 认证相关 API。
 * 这一层把登录、退出和当前用户信息接口统一收口，避免页面直接拼接路径。
 */

/**
 * 调用登录接口。
 *
 * @param {Record<string, unknown>} payload 登录表单
 * @returns {Promise<any>} 登录响应
 */
export const login = (payload) => request.post('/system/login', payload)

/**
 * 调用退出登录接口。
 *
 * @returns {Promise<any>} 退出响应
 */
export const logout = () => request.post('/system/logout')

/**
 * 获取当前登录用户信息。
 *
 * @returns {Promise<any>} 当前用户响应
 */
export const getCurrentUser = () => request.get('/system/me', { cancelKey: 'auth:me' })
