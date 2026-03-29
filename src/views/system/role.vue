<template>
  <div class="app-container">
    <el-card class="filter-card" shadow="never">
      <el-form :inline="true" :model="queryForm" @submit.prevent="handleQuery">
        <el-form-item label="角色名称">
          <el-input v-model="queryForm.roleName" placeholder="请输入角色名称" clearable />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" native-type="submit" :loading="loading" @click="handleQuery">查询</el-button>
          <el-button :disabled="loading" @click="handleReset">重置</el-button>
          <el-button type="success" :disabled="loading" @click="openCreateDialog">新增角色</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never">
      <el-table
        :data="tableData"
        border
        v-loading="loading"
        element-loading-text="正在加载角色列表..."
        empty-text="暂无角色数据"
      >
        <el-table-column prop="roleName" label="角色名称" min-width="160" />
        <el-table-column label="菜单权限" min-width="300">
          <template #default="{ row }">
            <el-space wrap>
              <el-tag v-for="item in splitMenuPerms(row.menuPerms)" :key="item" size="small">{{ menuLabelMap[item] || item }}</el-tag>
              <span v-if="splitMenuPerms(row.menuPerms).length === 0">-</span>
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
      <el-form :model="dialog.form" label-width="90px" @submit.prevent="handleSave">
        <el-form-item label="角色名称" required>
          <el-input v-model="dialog.form.roleName" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog.visible = false">取消</el-button>
        <el-button type="primary" native-type="submit" :loading="dialog.saving" @click="handleSave">保存</el-button>
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
import { deleteRole, fetchRolePageByForm, getRoleMenuCatalog, saveRoleForm, updateRoleMenuKeys } from '../../api/system'
import { useActivatedRefresh } from '../../utils/activated-refresh'
import { confirmAction, handleActionError, showSuccess, showWarning } from '../../utils/feedback'
import { createEmptyRoleForm, normalizeRoleForm, splitMenuPerms } from '../../utils/system-models'

// 角色管理页：负责角色分页、角色维护和菜单权限分配。
const loading = ref(false)
const tableData = ref([])
const tableFetchSeq = ref(0)
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

// 创建默认角色表单。
function createEmptyForm() {
  return createEmptyRoleForm()
}

// 拉取菜单目录，并构建菜单键到中文名称的映射。
async function fetchMenuCatalog() {
  const res = await getRoleMenuCatalog()
  menuCatalog.value = res.data || []
  const map = {}
  ;(res.data || []).forEach((item) => {
    map[item.key] = item.label
  })
  menuLabelMap.value = map
}

// 查询角色分页数据。
async function fetchTableData(options = {}) {
  const { silent = false } = options
  const currentFetchSeq = ++tableFetchSeq.value
  if (!silent) {
    loading.value = true
  }
  try {
    const res = await fetchRolePageByForm(queryForm, pagination)
    if (currentFetchSeq !== tableFetchSeq.value) return
    tableData.value = res.data?.records || []
    pagination.total = Number(res.data?.total || 0)
    markRefreshed()
  } finally {
    if (!silent && currentFetchSeq === tableFetchSeq.value) {
      loading.value = false
    }
  }
}

const { markRefreshed } = useActivatedRefresh(() => fetchTableData({ silent: true }), {
  minIntervalMs: 15000,
  shouldRefresh: () => !dialog.visible && !menuDialog.visible && !dialog.saving && !menuDialog.saving && !loading.value
})

// 以当前条件重新查询第一页。
function handleQuery() {
  pagination.pageNum = 1
  fetchTableData()
}

// 重置条件并重新查询。
function handleReset() {
  queryForm.roleName = ''
  pagination.pageNum = 1
  fetchTableData()
}

// 打开新增角色弹窗。
function openCreateDialog() {
  dialog.mode = 'create'
  dialog.form = createEmptyForm()
  dialog.visible = true
}

// 打开编辑角色弹窗。
function openEditDialog(row) {
  dialog.mode = 'edit'
  dialog.form = normalizeRoleForm(row)
  dialog.visible = true
}

// 打开菜单权限分配弹窗。
function openMenuDialog(row) {
  menuDialog.roleId = row.id
  menuDialog.menuKeys = splitMenuPerms(row.menuPerms)
  menuDialog.visible = true
}

// 保存角色基础信息。
async function handleSave() {
  if (!dialog.form.roleName) {
    showWarning('角色名称不能为空')
    return
  }
  dialog.saving = true
  try {
    await saveRoleForm(dialog.form)
    showSuccess(dialog.mode === 'create' ? '新增角色成功' : '更新角色成功')
    dialog.visible = false
    await fetchTableData()
  } finally {
    dialog.saving = false
  }
}

// 保存角色菜单权限。
async function handleSaveMenus() {
  menuDialog.saving = true
  try {
    await updateRoleMenuKeys(menuDialog.roleId, menuDialog.menuKeys)
    showSuccess('菜单权限更新成功')
    menuDialog.visible = false
    await fetchTableData()
  } finally {
    menuDialog.saving = false
  }
}

// 删除角色。
async function handleDelete(row) {
  try {
    await confirmAction(`确认删除角色《${row.roleName}》吗？`, { title: '删除确认', type: 'warning' })
    await deleteRole(row.id)
    showSuccess('删除成功')
    await fetchTableData()
  } catch (error) {
    handleActionError(error, '删除角色失败，请稍后重试')
  }
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
