<template>
  <div class="app-container">
    <el-card class="filter-card" shadow="never">
      <el-form :inline="true" :model="queryForm" class="query-form" @submit.prevent="handleQuery">
        <el-form-item label="上报时间">
          <el-date-picker
            v-model="queryForm.timeRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            style="width: 360px"
          />
        </el-form-item>
        <el-form-item label="用户关键字">
          <el-input v-model="queryForm.keyword" placeholder="用户名 / 姓名 / 消息关键字" clearable />
        </el-form-item>
        <el-form-item label="用户部门">
          <el-input v-model="queryForm.deptName" placeholder="部门名称" clearable />
        </el-form-item>
        <el-form-item label="日志级别">
          <el-select v-model="queryForm.logLevel" placeholder="全部" clearable style="width: 120px">
            <el-option v-for="item in logLevelOptions" :key="item" :label="item.toUpperCase()" :value="item" />
          </el-select>
        </el-form-item>
        <el-form-item label="日志类型">
          <el-select v-model="queryForm.logType" placeholder="全部" clearable style="width: 150px">
            <el-option v-for="item in logTypeOptions" :key="item" :label="formatLogType(item)" :value="item" />
          </el-select>
        </el-form-item>
        <el-form-item label="页面路径">
          <el-input v-model="queryForm.pagePath" placeholder="如 /project/manage" clearable />
        </el-form-item>
        <el-form-item label="链路ID">
          <el-input v-model="queryForm.traceId" placeholder="traceId" clearable />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" native-type="submit" :loading="loading" @click="handleQuery">查询</el-button>
          <el-button :disabled="loading" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="table-card" shadow="never">
      <div class="table-wrap">
        <el-table
          :data="tableData"
          border
          v-loading="loading"
          height="100%"
          element-loading-text="正在加载前端监控日志..."
          empty-text="暂无前端监控数据"
        >
          <el-table-column prop="createdTime" label="上报时间" min-width="170" />
          <el-table-column label="操作用户" min-width="160">
            <template #default="{ row }">
              <span>{{ formatOperator(row) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="deptName" label="用户部门" min-width="140" show-overflow-tooltip />
          <el-table-column label="级别" min-width="100">
            <template #default="{ row }">
              <el-tag size="small" :type="logLevelTagType(row.logLevel)">{{ formatLogLevel(row.logLevel) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="类型" min-width="120">
            <template #default="{ row }">
              <el-tag size="small" effect="plain">{{ formatLogType(row.logType) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="pagePath" label="页面路径" min-width="210" show-overflow-tooltip />
          <el-table-column prop="message" label="消息" min-width="240" show-overflow-tooltip />
          <el-table-column prop="traceId" label="链路ID" min-width="220" show-overflow-tooltip />
          <el-table-column label="详情" width="100" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openDetail(row)">查看</el-button>
            </template>
          </el-table-column>
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

    <el-drawer v-model="detailDialogVisible" title="前端监控详情" size="42%" append-to-body>
      <el-descriptions :column="1" border>
        <el-descriptions-item label="操作用户">{{ formatOperator(detailData) }}</el-descriptions-item>
        <el-descriptions-item label="用户部门">{{ detailData.deptName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="上报时间">{{ detailData.createdTime || '-' }}</el-descriptions-item>
        <el-descriptions-item label="日志级别">{{ formatLogLevel(detailData.logLevel) }}</el-descriptions-item>
        <el-descriptions-item label="日志类型">{{ formatLogType(detailData.logType) }}</el-descriptions-item>
        <el-descriptions-item label="事件名">{{ detailData.eventName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="页面路径">{{ detailData.pagePath || '-' }}</el-descriptions-item>
        <el-descriptions-item label="消息">{{ detailData.message || '-' }}</el-descriptions-item>
        <el-descriptions-item label="链路ID">{{ detailData.traceId || '-' }}</el-descriptions-item>
        <el-descriptions-item label="客户端IP">{{ detailData.clientIp || '-' }}</el-descriptions-item>
        <el-descriptions-item label="浏览器标识">{{ detailData.userAgent || '-' }}</el-descriptions-item>
      </el-descriptions>
      <div class="detail-json-section">
        <div class="detail-json-title">扩展详情</div>
        <pre class="detail-json-content">{{ formatDetailJson(detailData.detailJson) }}</pre>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { fetchFrontendMonitorPageByForm } from '../../api/system'
import { useActivatedRefresh } from '../../utils/activated-refresh'
import { showWarning } from '../../utils/feedback'

// 前端监控页面：管理员统一查看浏览器侧异常、慢链路和关键运行日志。
const logLevelOptions = ['info', 'warn', 'error']
const logTypeOptions = ['request', 'route', 'runtime_error', 'action', 'app']

const loading = ref(false)
const tableData = ref([])
const tableFetchSeq = ref(0)
const detailDialogVisible = ref(false)
const detailData = ref({})
const queryForm = reactive({
  keyword: '',
  deptName: '',
  logLevel: '',
  logType: '',
  pagePath: '',
  traceId: '',
  timeRange: []
})
const pagination = reactive({
  pageNum: 1,
  pageSize: 20,
  total: 0
})

async function fetchTableData() {
  const currentFetchSeq = ++tableFetchSeq.value
  loading.value = true
  try {
    const res = await fetchFrontendMonitorPageByForm(queryForm, pagination)
    if (currentFetchSeq !== tableFetchSeq.value) return
    tableData.value = res.data?.records || []
    pagination.total = Number(res.data?.total || 0)
    markRefreshed()
  } finally {
    if (currentFetchSeq === tableFetchSeq.value) {
      loading.value = false
    }
  }
}

const { markRefreshed } = useActivatedRefresh(fetchTableData, {
  minIntervalMs: 10000,
  shouldRefresh: () => !loading.value && !detailDialogVisible.value
})

function handleQuery() {
  pagination.pageNum = 1
  fetchTableData()
}

function handleReset() {
  queryForm.keyword = ''
  queryForm.deptName = ''
  queryForm.logLevel = ''
  queryForm.logType = ''
  queryForm.pagePath = ''
  queryForm.traceId = ''
  queryForm.timeRange = []
  pagination.pageNum = 1
  fetchTableData()
}

function formatOperator(row) {
  const name = row?.realName || row?.username
  if (name) return name
  if (row?.userId) return `用户ID:${row.userId}`
  return '匿名用户'
}

function formatLogLevel(level) {
  const text = String(level || '').toLowerCase()
  return text ? text.toUpperCase() : '-'
}

function logLevelTagType(level) {
  const text = String(level || '').toLowerCase()
  if (text === 'error') return 'danger'
  if (text === 'warn') return 'warning'
  if (text === 'info') return 'primary'
  return 'info'
}

function formatLogType(type) {
  const text = String(type || '').toLowerCase()
  const dict = {
    request: '接口请求',
    route: '页面路由',
    runtime_error: '运行时异常',
    action: '用户动作',
    app: '应用日志'
  }
  return dict[text] || text || '-'
}

function openDetail(row) {
  detailData.value = row || {}
  detailDialogVisible.value = true
}

function formatDetailJson(detailJson) {
  if (!detailJson) return '-'
  try {
    return JSON.stringify(JSON.parse(detailJson), null, 2)
  } catch (error) {
    return detailJson
  }
}

onMounted(async () => {
  try {
    await fetchTableData()
  } catch (error) {
    showWarning('加载前端监控日志失败，请稍后重试')
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
  height: calc(100vh - 340px);
  min-height: 320px;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding-top: 10px;
  flex-shrink: 0;
}

.detail-json-section {
  margin-top: 16px;
}

.detail-json-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
  color: #303133;
}

.detail-json-content {
  margin: 0;
  padding: 12px;
  min-height: 180px;
  background: #0f172a;
  color: #e2e8f0;
  border-radius: 8px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 12px;
  line-height: 1.6;
}

@media (max-width: 1200px) {
  .table-wrap {
    height: calc(100vh - 360px);
    min-height: 260px;
  }
}
</style>
