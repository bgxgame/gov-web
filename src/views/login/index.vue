<template>
  <div class="login-container">
    <el-card class="login-card">
      <h2>信创政务管理系统</h2>
      <el-form :model="loginForm" @submit.prevent="handleLogin">
        <el-form-item>
          <el-input v-model="loginForm.username" placeholder="用户名" autocomplete="username" autofocus />
        </el-form-item>
        <el-form-item>
          <el-input
            v-model="loginForm.password"
            type="password"
            placeholder="密码"
            show-password
            autocomplete="current-password"
          />
        </el-form-item>
        <el-button type="primary" native-type="submit" :loading="submitting" style="width: 100%">
          登录
        </el-button>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSessionStore } from '../../stores/session'
import { showSuccess, showWarning } from '../../utils/feedback'

// 职责：收集登录凭证并在成功后落到当前账号可访问的默认首页。
const router = useRouter()
const sessionStore = useSessionStore()
const submitting = ref(false)
const loginForm = reactive({
  username: '',
  password: ''
})

// 为什么存在：统一处理登录前校验、重复点击保护和登录成功后的跳转反馈。
const handleLogin = async () => {
  if (submitting.value) return
  if (!String(loginForm.username || '').trim()) {
    showWarning('请输入用户名')
    return
  }
  if (!String(loginForm.password || '').trim()) {
    showWarning('请输入密码')
    return
  }

  submitting.value = true
  try {
    await sessionStore.login(loginForm)
    showSuccess('登录成功')
    await router.replace(sessionStore.homePath || '/dashboard')
  } catch (error) {
    console.error(error)
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
}
</style>
