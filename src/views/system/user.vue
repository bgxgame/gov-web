<template>
  <div class="app-container">
    <el-card shadow="never">
      <template #header>
        <span>用户管理（第二阶段）</span>
      </template>
      <el-alert type="info" :closable="false" show-icon>
        当前版本优先交付项目与审批闭环。用户管理将在下一阶段对接 `GET /system/user/page`、
        `POST /system/user/add`、`PUT /system/user/update`、`PUT /system/user/status` 等接口。
      </el-alert>
    </el-card>
  </div>
</template>

<style scoped>
.app-container {
  padding: 10px;
}
</style>
