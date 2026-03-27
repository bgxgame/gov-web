<template>
  <div class="app-container">
    <el-card shadow="never">
      <template #header>
        <span>角色管理（第二阶段）</span>
      </template>
      <el-alert type="info" :closable="false" show-icon>
        角色与权限点配置将与 RBAC 表结构联动，在下一阶段提供 `role page/add/update` 与授权接口。
      </el-alert>
    </el-card>
  </div>
</template>

<style scoped>
.app-container {
  padding: 10px;
}
</style>
