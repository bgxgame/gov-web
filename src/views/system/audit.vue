<template>
  <div class="app-container">
    <el-card class="filter-card" shadow="never">
      <el-form :inline="true" :model="queryForm" class="query-form">
        <el-form-item label="请求时间">
          <el-date-picker
            v-model="queryForm.timeRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            style="width: 360px"
          />
        </el-form-item>
        <el-form-item label="操作用户">
          <el-input v-model="queryForm.keyword" placeholder="用户姓名 / 用户名" clearable />
        </el-form-item>
        <el-form-item label="用户部门">
          <el-input v-model="queryForm.deptName" placeholder="部门名称" clearable />
        </el-form-item>
        <el-form-item label="真实IP">
          <el-input v-model="queryForm.clientIp" placeholder="如 192.168.1.10" clearable />
        </el-form-item>
        <el-form-item label="请求路径">
          <el-input v-model="queryForm.requestUri" placeholder="如 /api/project/page" clearable />
        </el-form-item>
        <el-form-item label="请求方法">
          <el-select v-model="queryForm.requestMethod" placeholder="全部" clearable style="width: 120px">
            <el-option v-for="item in requestMethodOptions" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>
        <el-form-item label="耗时(ms)" class="duration-form-item">
          <el-input v-model="queryForm.durationMin" placeholder="最小" clearable style="width: 100px" />
          <span class="duration-split">-</span>
          <el-input v-model="queryForm.durationMax" placeholder="最大" clearable style="width: 100px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleQuery">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="table-card" shadow="never">
      <div class="table-wrap">
        <el-table :data="tableData" border v-loading="loading" height="100%">
          <el-table-column prop="requestTime" label="请求时间" min-width="170" />
          <el-table-column label="操作用户" min-width="160">
            <template #default="{ row }">
              <span>{{ formatOperator(row) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="deptName" label="用户部门" min-width="160" show-overflow-tooltip />
          <el-table-column label="真实IP" min-width="150">
            <template #default="{ row }">
              <span>{{ formatRealIp(row.clientIp) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="requestUri" label="请求路径" min-width="260" show-overflow-tooltip />
          <el-table-column label="请求方法" min-width="110">
            <template #default="{ row }">
              <el-tag size="small" :type="requestMethodTagType(row.requestMethod)">{{ row.requestMethod || '-' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="durationMs" label="耗时(ms)" min-width="100" />
        </el-table>
      </div>

      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="pagination.pageNum"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="pagination.total"
          @size-change="fetchTableData"
          @current-change="fetchTableData"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { fetchAuditPageByForm } from '../../api/system'
import { showWarning } from '../../utils/feedback'

// 审计日志管理页：筛选项与表格字段按契约一一对应，减少认知负担。
const requestMethodOptions = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']

const loading = ref(false)
const tableData = ref([])
const queryForm = reactive({
  keyword: '',
  deptName: '',
  requestMethod: '',
  requestUri: '',
  clientIp: '',
  durationMin: '',
  durationMax: '',
  timeRange: []
})
const pagination = reactive({
  pageNum: 1,
  pageSize: 20,
  total: 0
})

// 拉取审计分页数据。
async function fetchTableData() {
  loading.value = true
  try {
    const res = await fetchAuditPageByForm(queryForm, pagination)
    tableData.value = res.data?.records || []
    pagination.total = Number(res.data?.total || 0)
  } finally {
    loading.value = false
  }
}

// 以当前筛选条件重新查询第一页。
function handleQuery() {
  pagination.pageNum = 1
  fetchTableData()
}

// 清空筛选条件并重新查询。
function handleReset() {
  queryForm.keyword = ''
  queryForm.deptName = ''
  queryForm.requestMethod = ''
  queryForm.requestUri = ''
  queryForm.clientIp = ''
  queryForm.durationMin = ''
  queryForm.durationMax = ''
  queryForm.timeRange = []
  pagination.pageNum = 1
  fetchTableData()
}

// 格式化操作用户显示。
function formatOperator(row) {
  const name = row.realName || row.username
  if (name) return name
  if (row.userId) return `用户ID:${row.userId}`
  return '匿名请求'
}

// 统一展示真实 IP（回环地址归一化）。
function formatRealIp(ip) {
  const text = String(ip || '').trim()
  if (!text) return '-'
  if (text === '::1' || text === '0:0:0:0:0:0:0:1') return '127.0.0.1'
  return text
}

// 请求方法颜色映射。
function requestMethodTagType(method) {
  const text = String(method || '').toUpperCase()
  if (text === 'GET') return 'info'
  if (text === 'POST') return 'success'
  if (text === 'PUT') return 'warning'
  if (text === 'DELETE') return 'danger'
  return ''
}

onMounted(async () => {
  try {
    await fetchTableData()
  } catch (error) {
    showWarning('加载审计日志失败，请稍后重试')
  }
})
</script>

<style scoped>
.app-container {
  padding: 10px;
  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.filter-card {
  flex-shrink: 0;
}

.query-form {
  margin-bottom: -18px;
}

.duration-form-item :deep(.el-form-item__content) {
  display: flex;
  align-items: center;
}

.duration-split {
  margin: 0 8px;
  color: #909399;
}

.table-card {
  flex: 1;
  min-height: 0;
}

.table-wrap {
  height: calc(100vh - 320px);
  min-height: 320px;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding-top: 10px;
  flex-shrink: 0;
}

@media (max-width: 1200px) {
  .table-wrap {
    height: calc(100vh - 340px);
    min-height: 260px;
  }
}
</style>
