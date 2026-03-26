<template>
  <el-config-provider :locale="zhCn">
    <router-view />
  </el-config-provider>
</template>

<script setup>
// 引入 Element Plus 的中文包
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
</script>

<style>
html, body, #app {
  margin: 0;
  padding: 0;
  height: 100%;
}
</style>