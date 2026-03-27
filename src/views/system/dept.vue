<template>
  <div class="app-container">
    <el-card shadow="never">
      <template #header>
        <span>部门管理（第二阶段）</span>
      </template>
      <el-alert type="info" :closable="false" show-icon>
        部门树与负责人维护将在下一阶段实现，预期接口包括 `GET /system/dept/tree`、
        `POST /system/dept/add`、`PUT /system/dept/update`、`DELETE /system/dept/{id}`。
      </el-alert>
    </el-card>
  </div>
</template>

<style scoped>
.app-container {
  padding: 10px;
}
</style>
