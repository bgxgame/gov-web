<template>
  <div class="app-container">
    <el-card class="filter-card" shadow="never">
      <el-form :inline="true" :model="queryForm">
        <el-form-item label="角色名称">
          <el-input v-model="queryForm.roleName" placeholder="请输入角色名称" clearable />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleQuery">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
          <el-button type="success" @click="openCreateDialog">新增角色</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never">
      <el-table :data="tableData" border v-loading="loading">
        <el-table-column prop="roleName" label="角色名称" min-width="160" />
        <el-table-column label="菜单权限" min-width="300">
          <template #default="{ row }">
            <el-space wrap>
              <el-tag v-for="item in splitMenus(row.menuPerms)" :key="item" size="small">{{ menuLabelMap[item] || item }}</el-tag>
              <span v-if="splitMenus(row.menuPerms).length === 0">-</span>
            </el-space>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" min-width="180" />
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEditDialog(row)">编辑</el-button>
            <el-button link type="primary" @click="openMenuDialog(row)">分配菜单</el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
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

    <el-dialog v-model="dialog.visible" :title="dialog.mode === 'create' ? '新增角色' : '编辑角色'" width="520px">
      <el-form :model="dialog.form" label-width="90px">
        <el-form-item label="角色名称" required>
          <el-input v-model="dialog.form.roleName" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="dialog.saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="menuDialog.visible" title="分配菜单权限" width="560px">
      <div class="menu-grid">
        <el-checkbox-group v-model="menuDialog.menuKeys">
          <el-checkbox v-for="item in menuCatalog" :key="item.key" :label="item.key">{{ item.label }}</el-checkbox>
        </el-checkbox-group>
      </div>
      <template #footer>
        <el-button @click="menuDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="menuDialog.saving" @click="handleSaveMenus">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { addRole, deleteRole, getRoleMenuCatalog, getRolePage, updateRole, updateRoleMenus } from '../../api/system'

const loading = ref(false)
const tableData = ref([])
const menuCatalog = ref([])
const menuLabelMap = ref({})

const queryForm = reactive({
  roleName: ''
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

const menuDialog = reactive({
  visible: false,
  roleId: undefined,
  saving: false,
  menuKeys: []
})

function createEmptyForm() {
  return {
    id: undefined,
    roleName: ''
  }
}

function splitMenus(menuPerms) {
  if (!menuPerms) return []
  return String(menuPerms)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

async function fetchMenuCatalog() {
  const res = await getRoleMenuCatalog()
  menuCatalog.value = res.data || []
  const map = {}
  ;(res.data || []).forEach((item) => {
    map[item.key] = item.label
  })
  menuLabelMap.value = map
}

async function fetchTableData() {
  loading.value = true
  try {
    const res = await getRolePage({
      pageNum: pagination.pageNum,
      pageSize: pagination.pageSize,
      roleName: queryForm.roleName || undefined
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
  queryForm.roleName = ''
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
    roleName: row.roleName || ''
  }
  dialog.visible = true
}

function openMenuDialog(row) {
  menuDialog.roleId = row.id
  menuDialog.menuKeys = splitMenus(row.menuPerms)
  menuDialog.visible = true
}

async function handleSave() {
  if (!dialog.form.roleName) {
    ElMessage.warning('角色名称不能为空')
    return
  }
  dialog.saving = true
  try {
    if (dialog.mode === 'create') {
      await addRole(dialog.form)
      ElMessage.success('新增角色成功')
    } else {
      await updateRole(dialog.form)
      ElMessage.success('更新角色成功')
    }
    dialog.visible = false
    fetchTableData()
  } finally {
    dialog.saving = false
  }
}

async function handleSaveMenus() {
  menuDialog.saving = true
  try {
    await updateRoleMenus(menuDialog.roleId, { menuKeys: menuDialog.menuKeys })
    ElMessage.success('菜单权限更新成功')
    menuDialog.visible = false
    fetchTableData()
  } finally {
    menuDialog.saving = false
  }
}

async function handleDelete(row) {
  await ElMessageBox.confirm(`确认删除角色《${row.roleName}》吗？`, '删除确认', { type: 'warning' })
  await deleteRole(row.id)
  ElMessage.success('删除成功')
  fetchTableData()
}

onMounted(async () => {
  await Promise.all([fetchMenuCatalog(), fetchTableData()])
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

.menu-grid {
  max-height: 320px;
  overflow: auto;
  padding: 8px 0;
}
</style>
