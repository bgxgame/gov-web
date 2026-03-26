<template>
  <div class="app-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>部门组织架构</span>
          <el-button type="primary">新增部门</el-button>
        </div>
      </template>
      <el-table :data="[]" border row-key="id" default-expand-all>
        <el-table-column prop="deptName" label="部门名称" />
        <el-table-column prop="leaderName" label="负责人" />
        <el-table-column label="操作" width="200">
          <template #default>
            <el-button link type="primary">修改</el-button>
            <el-button link type="danger">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
// 后续编写逻辑
</script>