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
        <el-button type="primary" @click="handleLogin" style="width: 100%">登 录</el-button>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import request from '../../utils/request'
import { ElMessage } from 'element-plus'

const router = useRouter()
const loginForm = reactive({
  username: '',
  password: ''
})

const handleLogin = async () => {
  try {
    const res = await request.post('/system/login', loginForm)
    // 存储 Token (后端返回的 tokenValue)
    localStorage.setItem('token', res.data.tokenValue)
    ElMessage.success('登录成功')
    router.push('/dashboard') // 登录后跳转到首页
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