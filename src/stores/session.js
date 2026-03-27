import { defineStore } from 'pinia'
import { login as loginApi, logout as logoutApi } from '../api/auth'

const USER_KEY = 'user_info'

function parseUserInfo() {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch (error) {
    return null
  }
}

export const useSessionStore = defineStore('session', {
  state: () => ({
    token: localStorage.getItem('token') || '',
    userInfo: parseUserInfo()
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.token)
  },
  actions: {
    setToken(token) {
      this.token = token || ''
      if (token) {
        localStorage.setItem('token', token)
      } else {
        localStorage.removeItem('token')
      }
    },
    setUserInfo(userInfo) {
      this.userInfo = userInfo || null
      if (userInfo) {
        localStorage.setItem(USER_KEY, JSON.stringify(userInfo))
      } else {
        localStorage.removeItem(USER_KEY)
      }
    },
    clearSession() {
      this.setToken('')
      this.setUserInfo(null)
    },
    async login(payload) {
      const res = await loginApi(payload)
      this.setToken(res.data.tokenValue)
      this.setUserInfo({ username: payload.username })
      return res
    },
    async logout(callServer = true) {
      if (callServer) {
        try {
          await logoutApi()
        } catch (error) {
          // 忽略登出接口异常，仍继续清理本地会话
        }
      }
      this.clearSession()
    }
  }
})
