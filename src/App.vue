<template>
  <el-config-provider :locale="zhCn">
    <router-view />
  </el-config-provider>
</template>

<script setup>
// App.vue 只负责承载全局 UI 容器能力，本身不承载具体业务逻辑。
// 这里统一注入 Element Plus 中文包，让所有组件默认展示中文。
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
</script>

<style>
html, body, #app {
  margin: 0;
  padding: 0;
  height: 100%;
}
</style>
