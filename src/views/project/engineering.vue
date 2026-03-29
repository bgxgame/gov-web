<template>
  <div class="app-container">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>审批任务中心</span>
          <el-button type="primary" :loading="isCurrentTabLoading" :disabled="approveLoadingTaskId !== null" @click="refreshCurrentTab">
            刷新
          </el-button>
        </div>
      </template>

      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <el-tab-pane label="我的待办" name="todo">
          <el-table
            :data="todoList"
            border
            v-loading="loading.todo"
            element-loading-text="正在加载待办任务..."
            empty-text="暂无待办任务"
          >
            <el-table-column prop="taskName" label="任务名称" min-width="140" />
            <el-table-column prop="projectName" label="项目名称" min-width="180" />
            <el-table-column prop="leaderName" label="项目负责人" min-width="120" />
            <el-table-column prop="createTime" label="到达时间" min-width="180" />
            <el-table-column label="操作" width="200" fixed="right">
              <template #default="{ row }">
                <el-button
                  link
                  type="success"
                  :loading="approveLoadingTaskId === row.taskId"
                  :disabled="approveLoadingTaskId === row.taskId"
                  @click="handleApprove(row, true)"
                >
                  同意
                </el-button>
                <el-button
                  link
                  type="danger"
                  :loading="approveLoadingTaskId === row.taskId"
                  :disabled="approveLoadingTaskId === row.taskId"
                  @click="handleApprove(row, false)"
                >
                  驳回
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <div class="pagination-wrap">
            <el-pagination
              v-model:current-page="pagination.todo.pageNum"
              v-model:page-size="pagination.todo.pageSize"
              :page-sizes="[10, 20, 50]"
              layout="total, sizes, prev, pager, next, jumper"
              :total="pagination.todo.total"
              @size-change="fetchTodo"
              @current-change="fetchTodo"
            />
          </div>
        </el-tab-pane>

        <el-tab-pane label="我的已办" name="done">
          <el-table
            :data="doneList"
            border
            v-loading="loading.done"
            element-loading-text="正在加载已办任务..."
            empty-text="暂无已办任务"
          >
            <el-table-column prop="taskName" label="任务名称" min-width="140" />
            <el-table-column prop="projectName" label="项目名称" min-width="180" />
            <el-table-column prop="leaderName" label="项目负责人" min-width="120" />
            <el-table-column prop="createTime" label="任务时间" min-width="180" />
            <el-table-column prop="businessKey" label="业务ID" min-width="180" />
          </el-table>

          <div class="pagination-wrap">
            <el-pagination
              v-model:current-page="pagination.done.pageNum"
              v-model:page-size="pagination.done.pageSize"
              :page-sizes="[10, 20, 50]"
              layout="total, sizes, prev, pager, next, jumper"
              :total="pagination.done.total"
              @size-change="fetchDone"
              @current-change="fetchDone"
            />
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { approveTaskDecision, fetchDonePage, fetchTodoPage } from '../../api/flow'
import { useActivatedRefresh } from '../../utils/activated-refresh'
import { confirmAction, handleActionError, showSuccess } from '../../utils/feedback'

// 审批任务中心：负责展示我的待办、我的已办，并提交审批结果。
const activeTab = ref('todo')
const todoList = ref([])
const doneList = ref([])
const loading = reactive({
  todo: false,
  done: false
})
const loadedTabs = reactive({
  todo: false,
  done: false
})
const staleTabs = reactive({
  todo: false,
  done: false
})
const tabFetchSeq = reactive({
  todo: 0,
  done: 0
})
const approveLoadingTaskId = ref(null)
const pagination = reactive({
  todo: {
    pageNum: 1,
    pageSize: 10,
    total: 0
  },
  done: {
    pageNum: 1,
    pageSize: 10,
    total: 0
  }
})
const isCurrentTabLoading = computed(() => (activeTab.value === 'done' ? loading.done : loading.todo))

// 拉取待办分页，并更新待办 tab 的加载状态与脏标记。
async function fetchTodo(options = {}) {
  const { silent = false } = options
  const currentSeq = ++tabFetchSeq.todo
  if (!silent) {
    loading.todo = true
  }
  try {
    const res = await fetchTodoPage(pagination.todo)
    if (currentSeq !== tabFetchSeq.todo) return
    todoList.value = res.data?.records || []
    pagination.todo.total = Number(res.data?.total || 0)
    loadedTabs.todo = true
    staleTabs.todo = false
    markRefreshed()
  } finally {
    if (!silent && currentSeq === tabFetchSeq.todo) {
      loading.todo = false
    }
  }
}

// 拉取已办分页，并更新已办 tab 的加载状态与脏标记。
async function fetchDone(options = {}) {
  const { silent = false } = options
  const currentSeq = ++tabFetchSeq.done
  if (!silent) {
    loading.done = true
  }
  try {
    const res = await fetchDonePage(pagination.done)
    if (currentSeq !== tabFetchSeq.done) return
    doneList.value = res.data?.records || []
    pagination.done.total = Number(res.data?.total || 0)
    loadedTabs.done = true
    staleTabs.done = false
    markRefreshed()
  } finally {
    if (!silent && currentSeq === tabFetchSeq.done) {
      loading.done = false
    }
  }
}

// 刷新当前激活中的 tab。
async function refreshCurrentTab() {
  if (activeTab.value === 'done') {
    await fetchDone()
    return
  }
  await fetchTodo()
}

const { markRefreshed } = useActivatedRefresh(
  async () => {
    if (activeTab.value === 'done') {
      staleTabs.done = true
      await fetchDone({ silent: true })
      return
    }
    staleTabs.todo = true
    await fetchTodo({ silent: true })
  },
  {
    minIntervalMs: 10000,
    shouldRefresh: () => approveLoadingTaskId.value === null && !loading.todo && !loading.done
  }
)

// tab 切换时按需懒加载数据，避免首屏一次性把两页都打满。
async function handleTabChange(name) {
  if (name === 'done') {
    if (!loadedTabs.done || staleTabs.done) {
      await fetchDone()
    }
    return
  }

  if (!loadedTabs.todo || staleTabs.todo) {
    await fetchTodo()
  }
}

// 提交同意或驳回操作，并刷新相关 tab 数据。
async function handleApprove(row, approved) {
  if (!row?.taskId || approveLoadingTaskId.value === row.taskId) return
  approveLoadingTaskId.value = row.taskId
  try {
    await confirmAction(
      approved ? `确认同意任务《${row.taskName}》吗？` : `确认驳回任务《${row.taskName}》吗？`,
      { title: '审批确认', type: approved ? 'success' : 'warning' }
    )
    await approveTaskDecision(row.taskId, approved)
    showSuccess('审批操作成功')

    staleTabs.todo = true
    staleTabs.done = true
    await refreshCurrentTab()
  } catch (error) {
    handleActionError(error, '审批操作失败，请稍后重试')
  } finally {
    approveLoadingTaskId.value = null
  }
}

onMounted(async () => {
  await fetchTodo()
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

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding-top: 12px;
}
</style>
