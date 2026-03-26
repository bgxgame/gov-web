<template>
  <div class="app-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>工程进度管理</span>
          <el-button type="primary">新增工程</el-button>
        </div>
      </template>
      <el-table :data="[]" border style="width: 100%">
        <el-table-column prop="id" label="ID" width="180" />
        <el-table-column prop="projectName" label="工程名称" />
        <el-table-column prop="status" label="当前进度" />
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
// 后续编写逻辑
</script>