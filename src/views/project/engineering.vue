<template>
  <div class="app-container">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>审批任务中心</span>
          <el-button type="primary" @click="fetchAll">刷新</el-button>
        </div>
      </template>

      <el-tabs v-model="activeTab">
        <el-tab-pane label="我的待办" name="todo">
          <el-table :data="todoList" border v-loading="loading.todo">
            <el-table-column prop="taskName" label="任务名称" min-width="140" />
            <el-table-column prop="projectName" label="项目名称" min-width="180" />
            <el-table-column prop="leaderName" label="项目负责人" min-width="120" />
            <el-table-column prop="createTime" label="到达时间" min-width="180" />
            <el-table-column label="操作" width="200" fixed="right">
              <template #default="{ row }">
                <el-button link type="success" @click="handleApprove(row, true)">同意</el-button>
                <el-button link type="danger" @click="handleApprove(row, false)">驳回</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="我的已办" name="done">
          <el-table :data="doneList" border v-loading="loading.done">
            <el-table-column prop="taskName" label="任务名称" min-width="140" />
            <el-table-column prop="projectName" label="项目名称" min-width="180" />
            <el-table-column prop="leaderName" label="项目负责人" min-width="120" />
            <el-table-column prop="createTime" label="任务时间" min-width="180" />
            <el-table-column prop="businessKey" label="业务ID" min-width="180" />
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { approveTask, getDoneList, getTodoList } from '../../api/flow'

const activeTab = ref('todo')
const todoList = ref([])
const doneList = ref([])
const loading = reactive({
  todo: false,
  done: false
})

async function fetchTodo() {
  loading.todo = true
  try {
    const res = await getTodoList()
    todoList.value = res.data || []
  } finally {
    loading.todo = false
  }
}

async function fetchDone() {
  loading.done = true
  try {
    const res = await getDoneList()
    doneList.value = res.data || []
  } finally {
    loading.done = false
  }
}

async function fetchAll() {
  await Promise.all([fetchTodo(), fetchDone()])
}

async function handleApprove(row, approved) {
  await ElMessageBox.confirm(
    approved ? `确认同意任务「${row.taskName}」吗？` : `确认驳回任务「${row.taskName}」吗？`,
    '审批确认',
    { type: approved ? 'success' : 'warning' }
  )
  await approveTask({ taskId: row.taskId, approved })
  ElMessage.success('操作成功')
  fetchAll()
}

onMounted(() => {
  fetchAll()
})
</script>

<style scoped>
.app-container {
  padding: 10px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>
