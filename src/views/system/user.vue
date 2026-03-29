<template>
  <div class="app-container">
    <el-card class="filter-card" shadow="never">
      <el-form :inline="true" :model="queryForm">
        <el-form-item label="用户名">
          <el-input v-model="queryForm.username" placeholder="请输入用户名" clearable />
        </el-form-item>
        <el-form-item label="姓名">
          <el-input v-model="queryForm.realName" placeholder="请输入姓名" clearable />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="queryForm.status" placeholder="全部状态" clearable style="width: 130px">
            <el-option label="启用" :value="1" />
            <el-option label="停用" :value="0" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleQuery">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
          <el-button v-if="canManageUsers" type="success" @click="openCreateDialog">新增用户</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never">
      <el-table :data="tableData" border v-loading="loading">
        <el-table-column prop="username" label="用户名" min-width="120" />
        <el-table-column prop="realName" label="姓名" min-width="120" />
        <el-table-column prop="deptName" label="部门" min-width="130" />
        <el-table-column prop="roleNames" label="角色" min-width="160" />
        <el-table-column prop="phone" label="手机号" min-width="140" />
        <el-table-column label="状态" min-width="90">
          <template #default="{ row }">
            <el-switch
              :model-value="Number(row.status) === 1"
              @change="(val) => handleStatusChange(row, val)"
              inline-prompt
              active-text="启用"
              inactive-text="停用"
              :loading="statusLoadingUserId === row.id"
              :disabled="!canEditUser(row) || statusLoadingUserId === row.id"
            />
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" min-width="170" />
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" :disabled="!canEditUser(row)" @click="openEditDialog(row)">编辑</el-button>
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

    <el-dialog v-model="dialog.visible" :title="dialog.mode === 'create' ? '新增用户' : '编辑用户'" width="560px">
      <el-form :model="dialog.form" label-width="90px" v-loading="dialog.loadingOptions">
        <el-form-item label="用户名" required>
          <el-input v-model="dialog.form.username" :disabled="dialog.mode === 'edit'" />
        </el-form-item>
        <el-form-item label="姓名">
          <el-input v-model="dialog.form.realName" />
        </el-form-item>
        <el-form-item label="所属部门">
          <el-select
            v-model="dialog.form.deptId"
            clearable
            placeholder="请选择部门"
            style="width: 100%"
            :disabled="isDeptScopedManager"
          >
            <el-option v-for="dept in deptOptions" :key="dept.id" :label="dept.label" :value="dept.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="手机号">
          <el-input v-model="dialog.form.phone" maxlength="20" show-word-limit />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="dialog.form.status">
            <el-radio :label="1">启用</el-radio>
            <el-radio :label="0">停用</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="isAdmin" label="角色">
          <el-select v-model="dialog.form.roleIds" multiple clearable placeholder="请选择角色" style="width: 100%">
            <el-option v-for="item in roleOptions" :key="item.id" :label="item.roleName" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item :label="dialog.mode === 'create' ? '初始密码' : '重置密码'">
          <el-input
            v-model="dialog.form.password"
            :placeholder="dialog.mode === 'create' ? '不填默认 123456' : '不修改请留空'"
            show-password
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="dialog.saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useSessionStore } from '../../stores/session'
import {
  fetchUserPageByForm,
  getDeptTree,
  getRoleAll,
  getUserRoles,
  saveUserForm,
  setUserEnabled
} from '../../api/system'
import { showSuccess, showWarning } from '../../utils/feedback'
import { createEmptyUserForm, flattenDeptOptions, normalizeUserForm } from '../../utils/system-models'

// 用户管理页：负责用户分页、编辑、状态切换和角色配置。
const loading = ref(false)
const tableData = ref([])
const tableFetchSeq = ref(0)
const statusLoadingUserId = ref(null)
const deptOptions = ref([])
const roleOptions = ref([])
const deptOptionsLoaded = ref(false)
const roleOptionsLoaded = ref(false)

const sessionStore = useSessionStore()
const isAdmin = sessionStore.hasRole('admin')
const canManageUsers = sessionStore.hasMenu('system:user')
const isDeptScopedManager = !isAdmin && canManageUsers
const currentDeptId = sessionStore.userInfo?.deptId || undefined
const PHONE_REGEX = /^[0-9-]{7,20}$/

const queryForm = reactive({
  username: '',
  realName: '',
  status: undefined
})

const pagination = reactive({
  pageNum: 1,
  pageSize: 10,
  total: 0
})

const dialog = reactive({
  visible: false,
  mode: 'create',
  saving: false,
  loadingOptions: false,
  form: createEmptyForm()
})

// 创建默认用户表单。
function createEmptyForm() {
  return createEmptyUserForm(isDeptScopedManager ? currentDeptId : undefined)
}

// 判断当前行用户是否允许编辑。
function canEditUser(row) {
  if (isAdmin) return true
  if (!isDeptScopedManager) return false
  return row.deptId && currentDeptId && String(row.deptId) === String(currentDeptId)
}

// 懒加载部门选项。
async function ensureDeptOptionsLoaded() {
  if (deptOptionsLoaded.value) return
  const res = await getDeptTree()
  deptOptions.value = flattenDeptOptions(res.data || [])
  deptOptionsLoaded.value = true
}

// 懒加载角色选项，仅管理员需要。
async function ensureRoleOptionsLoaded() {
  if (!isAdmin || roleOptionsLoaded.value) return
  const res = await getRoleAll()
  roleOptions.value = res.data || []
  roleOptionsLoaded.value = true
}

// 打开弹窗前，确保部门和角色选项都准备好。
async function ensureDialogOptionsLoaded() {
  dialog.loadingOptions = true
  try {
    await Promise.all([ensureDeptOptionsLoaded(), ensureRoleOptionsLoaded()])
  } finally {
    dialog.loadingOptions = false
  }
}

// 查询用户分页数据。
async function fetchTableData(options = {}) {
  const { silent = false } = options
  const currentFetchSeq = ++tableFetchSeq.value
  if (!silent) {
    loading.value = true
  }
  try {
    const res = await fetchUserPageByForm(queryForm, pagination)
    if (currentFetchSeq !== tableFetchSeq.value) return
    tableData.value = res.data?.records || []
    pagination.total = Number(res.data?.total || 0)
  } finally {
    if (!silent && currentFetchSeq === tableFetchSeq.value) {
      loading.value = false
    }
  }
}

// 以当前查询条件重新查第一页。
function handleQuery() {
  pagination.pageNum = 1
  fetchTableData()
}

// 清空筛选条件并重新查询。
function handleReset() {
  queryForm.username = ''
  queryForm.realName = ''
  queryForm.status = undefined
  pagination.pageNum = 1
  fetchTableData()
}

// 打开新增用户弹窗。
async function openCreateDialog() {
  dialog.mode = 'create'
  dialog.form = createEmptyForm()
  dialog.visible = true
  await ensureDialogOptionsLoaded()
}

// 打开编辑弹窗，并在管理员场景下回填角色。
async function openEditDialog(row) {
  dialog.mode = 'edit'
  dialog.form = normalizeUserForm(row)
  dialog.visible = true
  await ensureDialogOptionsLoaded()
  if (isAdmin) {
    const roleRes = await getUserRoles(row.id)
    dialog.form.roleIds = roleRes.data || []
  }
}

// 保存用户表单。
async function handleSave() {
  if (!dialog.form.username && dialog.mode === 'create') {
    showWarning('用户名不能为空')
    return
  }

  const normalizedPhone = String(dialog.form.phone || '').trim()
  if (normalizedPhone && !PHONE_REGEX.test(normalizedPhone)) {
    showWarning('手机号格式不正确，请输入7-20位数字，可包含 "-"')
    return
  }
  dialog.form.phone = normalizedPhone || ''

  dialog.saving = true
  try {
    await saveUserForm(dialog.form, isDeptScopedManager ? currentDeptId : undefined)
    showSuccess(dialog.mode === 'create' ? '新增用户成功' : '更新用户成功')
    dialog.visible = false
    await fetchTableData({ silent: true })
  } finally {
    dialog.saving = false
  }
}

// 切换用户启停状态。
async function handleStatusChange(row, enabled) {
  if (!row?.id || statusLoadingUserId.value === row.id) return
  statusLoadingUserId.value = row.id
  try {
    await setUserEnabled(row.id, enabled)
    showSuccess('状态更新成功')
    await fetchTableData({ silent: true })
  } finally {
    statusLoadingUserId.value = null
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

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding-top: 12px;
}
</style>
