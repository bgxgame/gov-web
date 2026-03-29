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
            <el-button
              link
              type="success"
              :loading="rowActionLoading.submitId === row.id"
              :disabled="!canSubmit(row) || rowActionLoading.submitId === row.id"
              @click="handleSubmit(row)"
            >
              提交审批
            </el-button>
            <el-button
              link
              type="danger"
              :loading="rowActionLoading.deleteId === row.id"
              :disabled="!canDelete(row) || rowActionLoading.deleteId === row.id"
              @click="handleDelete(row)"
            >
              删除
            </el-button>
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
    >
      <div v-loading="editDialog.loading">
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
      </div>
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
import { getUserSimple } from '../../api/system'
import { deleteProject, fetchProjectPageByForm, getProjectDetail, saveProjectForm, submitProjectById } from '../../api/project'
import { useSessionStore } from '../../stores/session'
import { confirmAction, showError, showSuccess, showWarning } from '../../utils/feedback'
import { createEmptyProjectForm, normalizeProjectForm } from '../../utils/project-models'

// 项目管理页：负责项目分页、编辑、详情、删除和提交审批。
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
const tableFetchSeq = ref(0)
const userOptions = ref([])
const userOptionsLoaded = ref(false)
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
const rowActionLoading = reactive({
  submitId: null,
  deleteId: null
})

const MAINLAND_MOBILE_REGEX = /^1\d{10}$/

// 创建页面本地使用的默认项目表单。
function createEmptyForm() {
  return createEmptyProjectForm()
}

// 把接口返回或表格行数据统一规整成弹窗表单结构。
function normalizeProject(project) {
  return normalizeProjectForm(project, userOptions.value)
}

// 根据状态值返回页面展示文案。
function statusLabel(status) {
  const item = statusOptions.find((s) => Number(s.value) === Number(status))
  return item ? item.label : '-'
}

// 根据状态值返回 Tag 类型。
function statusTagType(status) {
  if (Number(status) === 1) return 'warning'
  if (Number(status) === 2) return 'success'
  if (Number(status) === 3) return 'danger'
  return 'info'
}

// 提交审批的前提条件与编辑条件保持一致。
function canSubmit(row) {
  return canEdit(row)
}

// 判断当前项目是否允许编辑。
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

// 删除项目的前提条件与编辑条件保持一致。
function canDelete(row) {
  const status = row.status === null || row.status === undefined ? null : Number(row.status)
  if (status === 2 && isAdmin) return true
  return canEdit(row)
}

// 懒加载负责人候选列表，避免页面首屏就额外打接口。
async function ensureUserOptionsLoaded() {
  if (userOptionsLoaded.value) return
  const res = await getUserSimple()
  let list = res.data || []
  if (isNormalUser) {
    const currentUserId = String(sessionStore.userInfo?.userId || '')
    list = list.filter((item) => String(item.id) === currentUserId)
  }
  userOptions.value = list
  userOptionsLoaded.value = true
}

// 查询项目分页数据。
async function fetchTableData(options = {}) {
  const { silent = false } = options
  const currentFetchSeq = ++tableFetchSeq.value
  if (!silent) {
    tableLoading.value = true
  }
  try {
    const res = await fetchProjectPageByForm(queryForm, pagination)
    if (currentFetchSeq !== tableFetchSeq.value) return
    tableData.value = res.data?.records || []
    pagination.total = Number(res.data?.total || 0)
  } finally {
    if (!silent && currentFetchSeq === tableFetchSeq.value) {
      tableLoading.value = false
    }
  }
}

// 以当前查询条件重新查询第一页。
function handleQuery() {
  pagination.pageNum = 1
  fetchTableData()
}

// 清空筛选条件并重新查询。
function handleReset() {
  queryForm.projectName = ''
  queryForm.status = undefined
  queryForm.province = ''
  pagination.pageNum = 1
  fetchTableData()
}

// 打开新增项目弹窗，并在普通用户场景下自动带出本人信息。
async function openCreateDialog() {
  editDialog.mode = 'create'
  editDialog.form = createEmptyForm()
  editDialog.visible = true
  editDialog.loading = true
  try {
    await ensureUserOptionsLoaded()
    if (isNormalUser) {
      const currentUser = userOptions.value.find((item) => String(item.id) === String(sessionStore.userInfo?.userId || ''))
      if (currentUser) {
        editDialog.form.leaderUserId = currentUser.id
        editDialog.form.leaderName = currentUser.realName || currentUser.username
        editDialog.form.leaderPhone = currentUser.phone || ''
      }
    }
  } finally {
    editDialog.loading = false
  }
}

// 打开编辑弹窗，优先拉取详情后再回填表单。
async function openEditDialog(row) {
  if (!row?.id) {
    showWarning('项目ID不存在，无法编辑')
    return
  }
  editDialog.mode = 'edit'
  editDialog.visible = true
  editDialog.loading = true
  try {
    await ensureUserOptionsLoaded()
    const res = await getProjectDetail(String(row.id))
    editDialog.form = normalizeProject(res.data || row)
  } catch (error) {
    showError('加载项目详情失败')
    editDialog.form = normalizeProject(row)
  } finally {
    editDialog.loading = false
  }
}

// 切换负责人时同步更新负责人姓名和电话。
function handleLeaderChange(userId) {
  const target = userOptions.value.find((item) => String(item.id) === String(userId))
  if (!target) return
  editDialog.form.leaderName = target.realName || target.username
  if (target.phone) {
    editDialog.form.leaderPhone = target.phone
  }
}

// 保存项目表单。
async function handleSave() {
  if (!editDialog.form.projectName) {
    showWarning('项目名称不能为空')
    return
  }
  const leaderPhone = String(editDialog.form.leaderPhone || '').trim()
  if (leaderPhone && !MAINLAND_MOBILE_REGEX.test(leaderPhone)) {
    showWarning('联系电话格式不正确，请填写11位手机号')
    return
  }

  editDialog.saving = true
  try {
    await saveProjectForm(editDialog.form)
    showSuccess(editDialog.mode === 'create' ? '项目新增成功' : '项目更新成功')
    editDialog.visible = false
    await fetchTableData({ silent: true })
  } finally {
    editDialog.saving = false
  }
}

// 打开项目详情弹窗。
async function handleDetail(row) {
  if (!row?.id) {
    showWarning('项目ID不存在，无法查看详情')
    return
  }
  detailDialog.visible = true
  detailDialog.loading = true
  try {
    const res = await getProjectDetail(String(row.id))
    detailData.value = normalizeProject(res.data || row)
    if (!res.data) {
      showWarning('未找到该项目详情，已展示列表数据')
    }
  } catch (error) {
    detailData.value = normalizeProject(row)
    showError('加载项目详情失败，已展示列表数据')
  } finally {
    detailDialog.loading = false
  }
}

// 把项目提交到审批流。
async function handleSubmit(row) {
  if (!row?.id || rowActionLoading.submitId === row.id) return
  rowActionLoading.submitId = row.id
  try {
    await confirmAction(`确认提交项目《${row.projectName}》进入审批流吗？`, { title: '提交确认', type: 'warning' })
    await submitProjectById(row.id)
    showSuccess('提交审批成功')
    await fetchTableData({ silent: true })
  } catch (error) {
    // 用户取消时不提示
  } finally {
    rowActionLoading.submitId = null
  }
}

// 删除指定项目。
async function handleDelete(row) {
  if (!row?.id) {
    showWarning('项目ID不存在，无法删除')
    return
  }
  if (rowActionLoading.deleteId === row.id) return
  rowActionLoading.deleteId = row.id
  try {
    await confirmAction(`确认删除项目《${row.projectName}》吗？`, { title: '删除确认', type: 'warning' })
    await deleteProject(String(row.id))
    showSuccess('删除成功')
    await fetchTableData({ silent: true })
  } catch (error) {
    // 用户取消时不提示
  } finally {
    rowActionLoading.deleteId = null
  }
}

onMounted(async () => {
  await fetchTableData()
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
