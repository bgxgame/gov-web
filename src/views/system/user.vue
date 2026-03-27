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
          <el-button type="success" @click="openCreateDialog">新增用户</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never">
      <el-table :data="tableData" border v-loading="loading">
        <el-table-column prop="username" label="用户名" min-width="120" />
        <el-table-column prop="realName" label="姓名" min-width="120" />
        <el-table-column prop="deptName" label="部门" min-width="130" />
        <el-table-column prop="phone" label="手机号" min-width="140" />
        <el-table-column label="状态" min-width="90">
          <template #default="{ row }">
            <el-switch
              :model-value="Number(row.status) === 1"
              @change="(val) => handleStatusChange(row, val)"
              inline-prompt
              active-text="启用"
              inactive-text="停用"
            />
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" min-width="170" />
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEditDialog(row)">编辑</el-button>
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
      <el-form :model="dialog.form" label-width="90px">
        <el-form-item label="用户名" required>
          <el-input v-model="dialog.form.username" :disabled="dialog.mode === 'edit'" />
        </el-form-item>
        <el-form-item label="姓名">
          <el-input v-model="dialog.form.realName" />
        </el-form-item>
        <el-form-item label="所属部门">
          <el-select v-model="dialog.form.deptId" clearable placeholder="请选择部门" style="width: 100%">
            <el-option v-for="dept in deptOptions" :key="dept.id" :label="dept.label" :value="dept.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="手机号">
          <el-input v-model="dialog.form.phone" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="dialog.form.status">
            <el-radio :label="1">启用</el-radio>
            <el-radio :label="0">停用</el-radio>
          </el-radio-group>
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
import { ElMessage } from 'element-plus'
import { addUser, getDeptTree, getUserPage, updateUser, updateUserStatus } from '../../api/system'

const loading = ref(false)
const tableData = ref([])
const deptOptions = ref([])

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
  form: createEmptyForm()
})

function createEmptyForm() {
  return {
    id: undefined,
    username: '',
    realName: '',
    deptId: undefined,
    phone: '',
    status: 1,
    password: ''
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

async function loadDeptOptions() {
  const res = await getDeptTree()
  deptOptions.value = flattenDeptTree(res.data || [], '')
}

async function fetchTableData() {
  loading.value = true
  try {
    const res = await getUserPage({
      pageNum: pagination.pageNum,
      pageSize: pagination.pageSize,
      username: queryForm.username || undefined,
      realName: queryForm.realName || undefined,
      status: queryForm.status
    })
    tableData.value = res.data?.records || []
    pagination.total = Number(res.data?.total || 0)
  } finally {
    loading.value = false
  }
}

function handleQuery() {
  pagination.pageNum = 1
  fetchTableData()
}

function handleReset() {
  queryForm.username = ''
  queryForm.realName = ''
  queryForm.status = undefined
  pagination.pageNum = 1
  fetchTableData()
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
    username: row.username || '',
    realName: row.realName || '',
    deptId: row.deptId,
    phone: row.phone || '',
    status: Number(row.status) === 1 ? 1 : 0,
    password: ''
  }
  dialog.visible = true
}

async function handleSave() {
  if (!dialog.form.username && dialog.mode === 'create') {
    ElMessage.warning('用户名不能为空')
    return
  }
  dialog.saving = true
  try {
    if (dialog.mode === 'create') {
      await addUser(dialog.form)
      ElMessage.success('新增用户成功')
    } else {
      await updateUser(dialog.form)
      ElMessage.success('更新用户成功')
    }
    dialog.visible = false
    fetchTableData()
  } finally {
    dialog.saving = false
  }
}

async function handleStatusChange(row, enabled) {
  await updateUserStatus({
    id: row.id,
    status: enabled ? 1 : 0
  })
  ElMessage.success('状态更新成功')
  fetchTableData()
}

onMounted(async () => {
  await Promise.all([loadDeptOptions(), fetchTableData()])
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
