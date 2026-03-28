<template>
  <div class="app-container">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>部门管理</span>
          <div class="actions">
            <el-button v-if="canManageUsers" @click="goUserManage">新增部门用户</el-button>
            <el-button v-if="isAdmin" type="primary" @click="openCreateDialog">新增部门</el-button>
          </div>
        </div>
      </template>

      <el-table :data="tableData" border row-key="id" default-expand-all v-loading="loading">
        <el-table-column prop="deptName" label="部门名称" min-width="220" />
        <el-table-column prop="leaderName" label="负责人" min-width="140" />
        <el-table-column v-if="isAdmin" label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEditDialog(row)">编辑</el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialog.visible" :title="dialog.mode === 'create' ? '新增部门' : '编辑部门'" width="520px">
      <el-form :model="dialog.form" label-width="90px">
        <el-form-item label="部门名称" required>
          <el-input v-model="dialog.form.deptName" />
        </el-form-item>
        <el-form-item label="上级部门">
          <el-select v-model="dialog.form.parentId" clearable placeholder="顶级部门" style="width: 100%">
            <el-option label="顶级部门" :value="0" />
            <el-option v-for="dept in deptOptions" :key="dept.id" :label="dept.label" :value="dept.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="负责人">
          <el-select v-model="dialog.form.leaderId" clearable placeholder="请选择负责人" style="width: 100%">
            <el-option
              v-for="user in userOptions"
              :key="user.id"
              :label="user.realName || user.username"
              :value="user.id"
            />
          </el-select>
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
import { useRouter } from 'vue-router'
import { useSessionStore } from '../../stores/session'
import { deleteDept, getDeptTree, getUserSimple, saveDeptForm } from '../../api/system'
import { confirmAction, showSuccess, showWarning } from '../../utils/feedback'
import { createEmptyDeptForm, flattenDeptOptions, normalizeDeptForm } from '../../utils/system-models'

// 部门管理页：负责部门树展示、编辑和删除。
const loading = ref(false)
const tableData = ref([])
const deptOptions = ref([])
const userOptions = ref([])

const router = useRouter()
const sessionStore = useSessionStore()
const isAdmin = sessionStore.hasRole('admin')
const canManageUsers = isAdmin || sessionStore.hasRole('dept_leader')

const dialog = reactive({
  visible: false,
  mode: 'create',
  saving: false,
  form: createEmptyForm()
})

// 创建默认部门表单。
function createEmptyForm() {
  return createEmptyDeptForm()
}

// 查询部门树并同步生成上级部门选择项。
async function fetchDeptTree() {
  loading.value = true
  try {
    const res = await getDeptTree()
    tableData.value = res.data || []
    deptOptions.value = flattenDeptOptions(res.data || [])
  } finally {
    loading.value = false
  }
}

// 获取负责人候选用户列表。
async function fetchUserSimple() {
  const res = await getUserSimple()
  userOptions.value = res.data || []
}

// 跳转到用户管理页，方便继续维护部门下用户。
function goUserManage() {
  router.push('/system/user')
}

// 打开新增部门弹窗。
function openCreateDialog() {
  dialog.mode = 'create'
  dialog.form = createEmptyForm()
  dialog.visible = true
}

// 打开编辑部门弹窗。
function openEditDialog(row) {
  dialog.mode = 'edit'
  dialog.form = normalizeDeptForm(row)
  dialog.visible = true
}

// 保存部门表单。
async function handleSave() {
  if (!dialog.form.deptName) {
    showWarning('部门名称不能为空')
    return
  }
  dialog.saving = true
  try {
    await saveDeptForm(dialog.form)
    showSuccess(dialog.mode === 'create' ? '新增部门成功' : '更新部门成功')
    dialog.visible = false
    fetchDeptTree()
  } finally {
    dialog.saving = false
  }
}

// 删除指定部门。
async function handleDelete(row) {
  await confirmAction(`确认删除部门《${row.deptName}》吗？`, { title: '删除确认', type: 'warning' })
  await deleteDept(row.id)
  showSuccess('删除成功')
  fetchDeptTree()
}

onMounted(async () => {
  await Promise.all([fetchDeptTree(), fetchUserSimple()])
})
</script>

<style scoped>
.app-container {
  padding: 10px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.actions {
  display: flex;
  gap: 8px;
}
</style>
