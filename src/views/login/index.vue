<template>
  <div class="login-container">
    <el-card class="login-card">
      <h2>项管平台</h2>
      <el-form :model="loginForm" @submit.prevent="handleLogin">
        <el-form-item>
          <el-input
            id="login-username"
            v-model="loginForm.username"
            name="username"
            placeholder="用户名"
            autocomplete="username"
            autofocus
          />
        </el-form-item>
        <el-form-item>
          <el-input
            id="login-password"
            v-model="loginForm.password"
            name="password"
            type="password"
            placeholder="密码"
            show-password
            autocomplete="current-password"
          />
        </el-form-item>
        <el-button type="primary" native-type="submit" :loading="submitting" style="width: 100%">
          登录
        </el-button>
        <div class="login-feedback-shell" aria-live="polite">
          <p v-if="authErrorMessage" class="login-feedback login-feedback--error">{{ authErrorMessage }}</p>
          <p v-else class="login-feedback login-feedback--hint">请输入账号密码后登录系统</p>
        </div>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { resolveFirstEnabledMenuPath, useSessionStore } from '../../stores/session'
import { getErrorMessage, showSuccess } from '../../utils/feedback'

/**
 * 职责：收集登录凭证，并在成功后跳转到当前账号可访问的默认首页。
 * 为什么存在：登录页是会话建立的起点，需要统一处理校验、提交态和登录后的去向。
 * 关联链路：登录 -> 建立会话 -> 解析默认首页 -> 进入系统。
 */
const router = useRouter()
const sessionStore = useSessionStore()
const submitting = ref(false)
const authErrorMessage = ref('')
const loginForm = reactive({
  username: '',
  password: ''
})

watch(
  () => [loginForm.username, loginForm.password],
  () => {
    if (authErrorMessage.value) {
      authErrorMessage.value = ''
    }
  }
)

/**
 * 作用：统一处理登录前校验、重复点击保护和成功后的跳转反馈。
 */
const handleLogin = async () => {
  if (submitting.value) return
  if (!String(loginForm.username || '').trim()) {
    authErrorMessage.value = '请输入用户名'
    return
  }
  if (!String(loginForm.password || '').trim()) {
    authErrorMessage.value = '请输入密码'
    return
  }

  submitting.value = true
  authErrorMessage.value = ''
  try {
    await sessionStore.login(loginForm)
    showSuccess('登录成功')
    await router.replace(sessionStore.homePath || resolveFirstEnabledMenuPath() || '/login')
  } catch (error) {
    authErrorMessage.value = getErrorMessage(error, '登录失败，请稍后重试')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.login-container {
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #f5f7fa;
}

.login-card {
  width: 400px;
  text-align: center;
  padding-bottom: 8px;
}

.login-feedback-shell {
  min-height: 34px;
  margin-top: 12px;
}

.login-feedback {
  margin: 0;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.5;
  text-align: left;
}

.login-feedback--hint {
  color: #64748b;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.login-feedback--error {
  color: #b42318;
  background: #fef3f2;
  border: 1px solid #fecdca;
}
</style>
