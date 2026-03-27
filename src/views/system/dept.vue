<template>
  <div class="app-container">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>部门管理</span>
          <el-button type="primary" @click="openCreateDialog">新增部门</el-button>
        </div>
      </template>

      <el-table :data="tableData" border row-key="id" default-expand-all v-loading="loading">
        <el-table-column prop="deptName" label="部门名称" min-width="180" />
        <el-table-column prop="leaderName" label="负责人" min-width="120" />
        <el-table-column prop="id" label="部门ID" min-width="120" />
        <el-table-column label="操作" width="200" fixed="right">
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
import { ElMessage, ElMessageBox } from 'element-plus'
import { addDept, deleteDept, getDeptTree, getUserSimple, updateDept } from '../../api/system'

const loading = ref(false)
const tableData = ref([])
const deptOptions = ref([])
const userOptions = ref([])

const dialog = reactive({
  visible: false,
  mode: 'create',
  saving: false,
  form: createEmptyForm()
})

function createEmptyForm() {
  return {
    id: undefined,
    parentId: 0,
    deptName: '',
    leaderId: undefined
  }
}

function flattenDeptTree(list, prefix) {
  const result = []
  ;(list || []).forEach((item) => {
    const label = prefix ? `${prefix} / ${item.deptName}` : item.deptName
    result.push({ id: item.id, label })
    if (item.children && item.children.length > 0) {
      result.push(...flattenDeptTree(item.children, label))
    }
  })
  return result
}

async function fetchDeptTree() {
  loading.value = true
  try {
    const res = await getDeptTree()
    tableData.value = res.data || []
    deptOptions.value = flattenDeptTree(res.data || [], '')
  } finally {
    loading.value = false
  }
}

async function fetchUserSimple() {
  const res = await getUserSimple()
  userOptions.value = res.data || []
}

function openCreateDialog() {
  dialog.mode = 'create'
  dialog.form = createEmptyForm()
  dialog.visible = true
}

function openEditDialog(row) {
  dialog.mode = 'edit'
  dialog.form = {
    id: row.id,
    parentId: row.parentId || 0,
    deptName: row.deptName || '',
    leaderId: row.leaderId
  }
  dialog.visible = true
}

async function handleSave() {
  if (!dialog.form.deptName) {
    ElMessage.warning('部门名称不能为空')
    return
  }
  dialog.saving = true
  try {
    if (dialog.mode === 'create') {
      await addDept(dialog.form)
      ElMessage.success('新增部门成功')
    } else {
      await updateDept(dialog.form)
      ElMessage.success('更新部门成功')
    }
    dialog.visible = false
    fetchDeptTree()
  } finally {
    dialog.saving = false
  }
}

async function handleDelete(row) {
  await ElMessageBox.confirm(`确认删除部门「${row.deptName}」吗？`, '删除确认', { type: 'warning' })
  await deleteDept(row.id)
  ElMessage.success('删除成功')
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
</style>
