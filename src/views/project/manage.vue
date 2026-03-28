<template>
  <div class="app-container">
    <el-card class="filter-card" shadow="never">
      <el-form :inline="true" :model="queryForm" class="query-form">
        <el-form-item label="项目名称">
          <el-input v-model="queryForm.projectName" placeholder="请输入项目名称" clearable />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="queryForm.status" placeholder="全部状态" clearable style="width: 140px">
            <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="省份">
          <el-input v-model="queryForm.province" placeholder="如：陕西省" clearable />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleQuery">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
          <el-button type="success" @click="openCreateDialog">新增项目</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never">
      <el-table :data="tableData" border v-loading="tableLoading">
        <el-table-column prop="projectName" label="项目名称" min-width="180" />
        <el-table-column prop="projectCode" label="项目编号" min-width="130" />
        <el-table-column prop="address" label="地址" min-width="220" />
        <el-table-column prop="leaderName" label="负责人" min-width="100" />
        <el-table-column prop="leaderPhone" label="联系电话" min-width="130" />
        <el-table-column label="状态" min-width="100">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" min-width="170" />
        <el-table-column label="操作" width="360" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleDetail(row)">详情</el-button>
            <el-button link type="primary" :disabled="!canEdit(row)" @click="openEditDialog(row)">编辑</el-button>
            <el-button link type="success" :disabled="!canSubmit(row)" @click="handleSubmit(row)">提交审批</el-button>
            <el-button link type="danger" :disabled="!canDelete(row)" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="pagination.pageNum"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="pagination.total"
          @size-change="fetchTableData"
          @current-change="fetchTableData"
        />
      </div>
    </el-card>

    <el-dialog
      v-model="editDialog.visible"
      :title="editDialog.mode === 'create' ? '新增项目' : '编辑项目'"
      width="760px"
      :close-on-click-modal="false"
      destroy-on-close
      v-loading="editDialog.loading"
    >
      <el-form :model="editDialog.form" label-width="90px">
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="项目名称" required>
              <el-input v-model="editDialog.form.projectName" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="项目编号">
              <el-input v-model="editDialog.form.projectCode" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="省份">
              <el-input v-model="editDialog.form.province" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="城市">
              <el-input v-model="editDialog.form.city" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="区县">
              <el-input v-model="editDialog.form.district" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="项目地址">
              <el-input v-model="editDialog.form.address" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="经度">
              <el-input v-model="editDialog.form.longitude" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="纬度">
              <el-input v-model="editDialog.form.latitude" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="负责人">
              <el-select
                v-model="editDialog.form.leaderUserId"
                filterable
                clearable
                placeholder="请选择负责人"
                style="width: 100%"
                :disabled="isNormalUser"
                @change="handleLeaderChange"
              >
                <el-option
                  v-for="user in userOptions"
                  :key="user.id"
                  :label="`${user.realName || user.username} (${user.username})`"
                  :value="user.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="联系电话">
              <el-input v-model="editDialog.form.leaderPhone" placeholder="可自动回填或手工输入" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="项目描述">
              <el-input v-model="editDialog.form.description" type="textarea" :rows="3" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="editDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="editDialog.saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="detailDialog.visible" title="项目详情" width="72%" :close-on-click-modal="false" destroy-on-close>
      <el-descriptions :column="1" border v-loading="detailDialog.loading">
        <el-descriptions-item label="项目名称">{{ detailData.projectName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="项目编号">{{ detailData.projectCode || '-' }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="statusTagType(detailData.status)" size="small">{{ statusLabel(detailData.status) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="负责人">{{ detailData.leaderName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="联系电话">{{ detailData.leaderPhone || '-' }}</el-descriptions-item>
        <el-descriptions-item label="省市区">
          {{ [detailData.province, detailData.city, detailData.district].filter(Boolean).join(' / ') || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="项目地址">{{ detailData.address || '-' }}</el-descriptions-item>
        <el-descriptions-item label="坐标">{{ detailData.longitude || '-' }}, {{ detailData.latitude || '-' }}</el-descriptions-item>
        <el-descriptions-item label="项目描述">{{ detailData.description || '-' }}</el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getUserSimple } from '../../api/system'
import { addProject, deleteProject, getProjectDetail, getProjectPage, submitProject, updateProject } from '../../api/project'
import { useSessionStore } from '../../stores/session'

const statusOptions = [
  { label: '待提交', value: 0 },
  { label: '审批中', value: 1 },
  { label: '已通过', value: 2 },
  { label: '已驳回', value: 3 }
]

const queryForm = reactive({
  projectName: '',
  status: undefined,
  province: ''
})

const pagination = reactive({
  pageNum: 1,
  pageSize: 10,
  total: 0
})

const tableLoading = ref(false)
const tableData = ref([])
const userOptions = ref([])
const sessionStore = useSessionStore()
const isAdmin = sessionStore.hasRole('admin')
const isDeptLeader = sessionStore.hasRole('dept_leader') && !isAdmin
const isNormalUser = !isAdmin && !isDeptLeader

const editDialog = reactive({
  visible: false,
  mode: 'create',
  loading: false,
  saving: false,
  form: createEmptyForm()
})

const detailDialog = reactive({
  visible: false,
  loading: false
})
const detailData = ref(createEmptyForm())

function createEmptyForm() {
  return {
    id: undefined,
    projectName: '',
    projectCode: '',
    address: '',
    province: '',
    city: '',
    district: '',
    longitude: '',
    latitude: '',
    leaderUserId: undefined,
    leaderName: '',
    leaderPhone: '',
    description: '',
    status: 0,
    creatorDeptId: undefined
  }
}

function normalizeProject(project) {
  if (!project) return createEmptyForm()
  const matchedUser = userOptions.value.find(
    (item) =>
      String(item.id) === String(project.leaderUserId || '') ||
      (project.leaderName && (item.realName === project.leaderName || item.username === project.leaderName)) ||
      (project.leaderPhone && item.phone === project.leaderPhone)
  )
  return {
    id: project.id ? String(project.id) : undefined,
    projectName: project.projectName || '',
    projectCode: project.projectCode || '',
    address: project.address || '',
    province: project.province || '',
    city: project.city || '',
    district: project.district || '',
    longitude: project.longitude ?? '',
    latitude: project.latitude ?? '',
    leaderUserId: matchedUser?.id,
    leaderName: project.leaderName || '',
    leaderPhone: project.leaderPhone || '',
    description: project.description || '',
    status: project.status ?? 0,
    creatorDeptId: project.creatorDeptId
  }
}

function statusLabel(status) {
  const item = statusOptions.find((s) => Number(s.value) === Number(status))
  return item ? item.label : '-'
}

function statusTagType(status) {
  if (Number(status) === 1) return 'warning'
  if (Number(status) === 2) return 'success'
  if (Number(status) === 3) return 'danger'
  return 'info'
}

function canSubmit(row) {
  return canEdit(row)
}

function canEdit(row) {
  const status = row.status === null || row.status === undefined ? null : Number(row.status)
  if (!(status === null || status === 0 || status === 3)) return false
  if (isAdmin) return true
  const currentUserId = String(sessionStore.userInfo?.userId || '')
  const currentDeptId = String(sessionStore.userInfo?.deptId || '')
  const creatorId = String(row.creatorId || '')
  const creatorDeptId = String(row.creatorDeptId || '')
  if (isDeptLeader) {
    return currentDeptId && creatorDeptId && currentDeptId === creatorDeptId
  }
  return currentUserId && creatorId && currentUserId === creatorId
}

function canDelete(row) {
  return canEdit(row)
}

async function fetchTableData() {
  tableLoading.value = true
  try {
    const res = await getProjectPage({
      pageNum: pagination.pageNum,
      pageSize: pagination.pageSize,
      projectName: queryForm.projectName || undefined,
      status: queryForm.status,
      province: queryForm.province || undefined
    })
    tableData.value = res.data?.records || []
    pagination.total = Number(res.data?.total || 0)
  } finally {
    tableLoading.value = false
  }
}

function handleQuery() {
  pagination.pageNum = 1
  fetchTableData()
}

function handleReset() {
  queryForm.projectName = ''
  queryForm.status = undefined
  queryForm.province = ''
  pagination.pageNum = 1
  fetchTableData()
}

function openCreateDialog() {
  editDialog.mode = 'create'
  editDialog.form = createEmptyForm()
  if (isNormalUser) {
    const currentUser = userOptions.value.find((item) => String(item.id) === String(sessionStore.userInfo?.userId || ''))
    if (currentUser) {
      editDialog.form.leaderUserId = currentUser.id
      editDialog.form.leaderName = currentUser.realName || currentUser.username
      editDialog.form.leaderPhone = currentUser.phone || ''
    }
  }
  editDialog.visible = true
}

async function openEditDialog(row) {
  if (!row?.id) {
    ElMessage.warning('项目ID不存在，无法编辑')
    return
  }
  editDialog.mode = 'edit'
  editDialog.visible = true
  editDialog.loading = true
  try {
    const res = await getProjectDetail(String(row.id))
    editDialog.form = normalizeProject(res.data || row)
  } catch (error) {
    ElMessage.error('加载项目详情失败')
    editDialog.form = normalizeProject(row)
  } finally {
    editDialog.loading = false
  }
}

function handleLeaderChange(userId) {
  const target = userOptions.value.find((item) => String(item.id) === String(userId))
  if (!target) return
  editDialog.form.leaderName = target.realName || target.username
  if (target.phone) {
    editDialog.form.leaderPhone = target.phone
  }
}

async function handleSave() {
  if (!editDialog.form.projectName) {
    ElMessage.warning('项目名称不能为空')
    return
  }

  editDialog.saving = true
  try {
    const payload = {
      ...editDialog.form,
      longitude: editDialog.form.longitude === '' ? null : Number(editDialog.form.longitude),
      latitude: editDialog.form.latitude === '' ? null : Number(editDialog.form.latitude)
    }
    if (editDialog.mode === 'create') {
      await addProject(payload)
      ElMessage.success('新增成功')
    } else {
      await updateProject(payload)
      ElMessage.success('更新成功')
    }
    editDialog.visible = false
    fetchTableData()
  } finally {
    editDialog.saving = false
  }
}

async function handleDetail(row) {
  if (!row?.id) {
    ElMessage.warning('项目ID不存在，无法查看详情')
    return
  }
  detailDialog.visible = true
  detailDialog.loading = true
  try {
    const res = await getProjectDetail(String(row.id))
    detailData.value = normalizeProject(res.data || row)
    if (!res.data) {
      ElMessage.warning('未找到该项目详情，已展示列表数据')
    }
  } catch (error) {
    detailData.value = normalizeProject(row)
    ElMessage.error('加载项目详情失败，已展示列表数据')
  } finally {
    detailDialog.loading = false
  }
}

async function handleSubmit(row) {
  try {
    await ElMessageBox.confirm(`确认提交项目《${row.projectName}》进入审批流吗？`, '提交确认', {
      type: 'warning'
    })
    const detailRes = await getProjectDetail(String(row.id))
    if (!detailRes.data) {
      ElMessage.warning('项目详情不存在，无法提交')
      return
    }
    await submitProject(detailRes.data)
    ElMessage.success('提交审批成功')
    fetchTableData()
  } catch (error) {
    // 取消提交不提示错误
  }
}

async function handleDelete(row) {
  if (!row?.id) {
    ElMessage.warning('项目ID不存在，无法删除')
    return
  }
  try {
    await ElMessageBox.confirm(`确认删除项目《${row.projectName}》吗？`, '删除确认', { type: 'warning' })
    await deleteProject(String(row.id))
    ElMessage.success('删除成功')
    fetchTableData()
  } catch (error) {
    // 取消删除不提示错误
  }
}

async function loadUserOptions() {
  const res = await getUserSimple()
  let list = res.data || []
  if (isNormalUser) {
    const currentUserId = String(sessionStore.userInfo?.userId || '')
    list = list.filter((item) => String(item.id) === currentUserId)
  }
  userOptions.value = list
}

onMounted(async () => {
  await Promise.all([fetchTableData(), loadUserOptions()])
})
</script>

<style scoped>
.app-container {
  padding: 10px;
}

.filter-card {
  margin-bottom: 10px;
}

.query-form {
  margin-bottom: -18px;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding-top: 12px;
}
</style>
