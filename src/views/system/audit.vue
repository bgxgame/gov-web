<template>
  <div class="app-container">
    <el-card class="filter-card" shadow="never">
      <el-form :inline="true" :model="queryForm" class="query-form">
        <el-form-item label="用户关键字">
          <el-input v-model="queryForm.keyword" placeholder="用户名/姓名" clearable />
        </el-form-item>
        <el-form-item label="请求方法">
          <el-select v-model="queryForm.requestMethod" placeholder="全部" clearable style="width: 120px">
            <el-option v-for="item in requestMethodOptions" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>
        <el-form-item label="请求路径">
          <el-input v-model="queryForm.requestUri" placeholder="如 /api/project/page" clearable />
        </el-form-item>
        <el-form-item label="状态码">
          <el-select v-model="queryForm.httpStatus" placeholder="全部" clearable style="width: 120px">
            <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="客户端IP">
          <el-input v-model="queryForm.clientIp" placeholder="如 192.168.1.10" clearable />
        </el-form-item>
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="queryForm.timeRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            style="width: 360px"
          />
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
        <el-table-column label="操作用户" min-width="170">
          <template #default="{ row }">
            <span>{{ formatOperator(row) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="请求方法" min-width="110">
          <template #default="{ row }">
            <el-tag size="small" :type="requestMethodTagType(row.requestMethod)">{{ row.requestMethod || '-' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="requestUri" label="请求路径" min-width="260" show-overflow-tooltip />
        <el-table-column label="状态码" min-width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="statusTagType(row.httpStatus)">{{ row.httpStatus ?? '-' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="clientIp" label="客户端IP" min-width="150" />
        <el-table-column prop="durationMs" label="耗时(ms)" min-width="100" />
        <el-table-column prop="traceId" label="链路ID" min-width="220" show-overflow-tooltip />
        <el-table-column prop="userAgent" label="客户端标识" min-width="260" show-overflow-tooltip />
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

// 审计日志管理页：仅面向管理员展示系统接口访问轨迹，支持筛选和分页查看。
const requestMethodOptions = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
const statusOptions = [
  { label: '200 成功', value: 200 },
  { label: '401 未登录', value: 401 },
  { label: '403 无权限', value: 403 },
  { label: '500 服务异常', value: 500 }
]

const loading = ref(false)
const tableData = ref([])
const queryForm = reactive({
  keyword: '',
  requestMethod: '',
  requestUri: '',
  httpStatus: undefined,
  clientIp: '',
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
  queryForm.requestMethod = ''
  queryForm.requestUri = ''
  queryForm.httpStatus = undefined
  queryForm.clientIp = ''
  queryForm.timeRange = []
  pagination.pageNum = 1
  fetchTableData()
}

// 格式化审计操作用户显示。
function formatOperator(row) {
  const name = row.realName || row.username
  if (name && row.userId) return `${name}(${row.userId})`
  if (name) return name
  if (row.userId) return `用户ID:${row.userId}`
  return '匿名请求'
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

// HTTP 状态码颜色映射。
function statusTagType(status) {
  const code = Number(status)
  if (code >= 200 && code < 300) return 'success'
  if (code >= 400 && code < 500) return 'warning'
  if (code >= 500) return 'danger'
  return 'info'
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
