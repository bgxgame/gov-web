<template>
  <div class="login-container">
    <el-card class="login-card">
      <h2>信创政务管理系统</h2>
      <el-form :model="loginForm">
        <el-form-item>
          <el-input v-model="loginForm.username" placeholder="用户名" />
        </el-form-item>
        <el-form-item>
          <el-input v-model="loginForm.password" type="password" placeholder="密码" />
        </el-form-item>
        <el-button type="primary" @click="handleLogin" style="width: 100%">登录</el-button>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useSessionStore } from '../../stores/session'
import { showSuccess } from '../../utils/feedback'

// 登录页只负责收集账号密码、触发登录动作，并按权限落到默认首页。
const router = useRouter()
const sessionStore = useSessionStore()
const loginForm = reactive({
  username: '',
  password: ''
})

// 执行登录并在成功后跳转到系统默认首页。
const handleLogin = async () => {
  try {
    await sessionStore.login(loginForm)
    showSuccess('登录成功')
    router.push(sessionStore.homePath || '/dashboard')
  } catch (error) {
    console.error(error)
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
