<template>
  <div class="app-container">
    <el-card class="filter-card" shadow="never">
      <el-form :inline="true" :model="queryForm" class="query-form" @submit.prevent="handleQuery">
        <el-form-item label="项目名称">
          <el-input v-model="queryForm.projectName" placeholder="请输入项目名称" clearable />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="queryForm.status" placeholder="全部状态" clearable style="width: 140px">
            <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="省份">
          <el-select v-model="queryForm.province" placeholder="全部省份" clearable style="width: 160px">
            <el-option v-for="item in provinceOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="城市">
          <el-select
            v-model="queryForm.city"
            placeholder="全部城市"
            clearable
            style="width: 160px"
            :disabled="!queryForm.province"
          >
            <el-option v-for="item in queryCityOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="区县">
          <el-select
            v-model="queryForm.district"
            placeholder="全部区县"
            clearable
            style="width: 160px"
            :disabled="!queryForm.city"
          >
            <el-option v-for="item in queryDistrictOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" native-type="submit" :loading="tableLoading">查询</el-button>
          <el-button :disabled="tableLoading" @click="handleReset">重置</el-button>
          <el-button type="success" :disabled="tableLoading" @click="openCreateDialog">新增项目</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never">
      <el-table
        :data="tableData"
        border
        v-loading="tableLoading"
        element-loading-text="正在加载项目列表..."
        empty-text="暂无项目数据"
      >
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
      width="820px"
      :close-on-click-modal="false"
      :before-close="handleBeforeCloseEditDialog"
      destroy-on-close
    >
      <div v-loading="editDialog.loading">
        <el-form :model="editDialog.form" label-width="90px" @submit.prevent="handleSave">
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
              <el-select v-model="editDialog.form.province" placeholder="请选择省份" style="width: 100%">
                <el-option v-for="item in provinceOptions" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="城市">
              <el-select
                v-model="editDialog.form.city"
                placeholder="请选择城市"
                style="width: 100%"
                :disabled="!editDialog.form.province"
              >
                <el-option v-for="item in editCityOptions" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="区县">
              <el-select
                v-model="editDialog.form.district"
                placeholder="请选择区县"
                style="width: 100%"
                :disabled="!editDialog.form.city"
              >
                <el-option v-for="item in editDistrictOptions" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
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
          <el-col :span="24">
            <el-form-item label="项目附件">
              <div class="attachment-panel">
                <div class="attachment-toolbar">
                  <el-upload
                    :show-file-list="false"
                    :multiple="true"
                    :http-request="handleAttachmentUpload"
                    :disabled="editDialog.saving"
                  >
                    <el-button type="primary" plain :loading="editDialog.uploadingCount > 0">
                      上传文件
                    </el-button>
                  </el-upload>
                  <span class="attachment-tip">
                    支持图片、文档、压缩包等常见格式，最多同时上传 {{ UPLOAD_CONCURRENCY_LIMIT }} 个文件。
                  </span>
                </div>
                <div v-if="visibleUploadTasks.length" class="upload-queue-list">
                  <div
                    v-for="task in visibleUploadTasks"
                    :key="task.uid"
                    class="upload-queue-item"
                  >
                    <div class="attachment-summary">
                      <span class="attachment-name">{{ task.name }}</span>
                      <span class="attachment-meta">
                        {{ task.status === 'queued' ? '排队中' : '上传中' }}
                        · {{ formatFileSize(task.size) }}
                      </span>
                    </div>
                    <div class="upload-progress-wrap">
                      <el-progress :percentage="task.progress" :stroke-width="8" />
                    </div>
                  </div>
                </div>
                <div v-if="editDialog.form.attachments.length" class="attachment-list">
                  <div
                    v-for="file in editDialog.form.attachments"
                    :key="attachmentKey(file)"
                    class="attachment-item"
                  >
                    <div class="attachment-summary">
                      <div class="attachment-title-row">
                        <span class="attachment-icon" :class="`attachment-icon--${resolveAttachmentTypeMeta(file).tone}`">
                          <el-icon>
                            <component :is="resolveAttachmentTypeMeta(file).icon" />
                          </el-icon>
                        </span>
                        <span class="attachment-type-label">{{ resolveAttachmentTypeMeta(file).label }}</span>
                      </div>
                      <span
                        class="attachment-name"
                        :class="{ 'is-clickable': file.isImage }"
                        @click="file.isImage ? handleViewAttachment(file) : undefined"
                      >
                        {{ file.fileName }}
                      </span>
                      <span class="attachment-meta">
                        {{ formatFileSize(file.fileSize) }}
                        <template v-if="file.fileType"> · {{ file.fileType }}</template>
                      </span>
                    </div>
                    <div class="attachment-actions">
                      <el-button v-if="file.isImage" link type="primary" @click="handleViewAttachment(file)">查看</el-button>
                      <el-button link type="primary" @click="handleDownloadAttachment(file)">下载</el-button>
                      <el-button link type="danger" @click="handleRemoveAttachment(file)">
                        移除
                      </el-button>
                    </div>
                  </div>
                </div>
                <div v-else class="attachment-empty">暂未上传附件</div>
              </div>
            </el-form-item>
          </el-col>
        </el-row>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="handleCloseEditDialog">取消</el-button>
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
        <el-descriptions-item label="项目附件">
          <div v-if="detailData.attachments.length" class="detail-attachment-wrap">
            <div v-if="detailImageAttachments.length" class="detail-image-list">
              <div class="detail-image-toolbar">
                <span class="attachment-meta">图片附件默认按需加载缩略图，减少详情首屏等待。</span>
                <el-button link type="primary" @click="loadAllDetailImageThumbs">加载全部缩略图</el-button>
              </div>
                <div
                  v-for="(file, index) in detailImageAttachments"
                  :key="attachmentKey(file)"
                  class="detail-image-card"
                >
                <div class="attachment-title-row">
                  <span class="attachment-icon attachment-icon--image">
                    <el-icon>
                      <component :is="resolveAttachmentTypeMeta(file).icon" />
                    </el-icon>
                  </span>
                  <span class="attachment-type-label">{{ resolveAttachmentTypeMeta(file).label }}</span>
                </div>
                  <template v-if="isDetailImageThumbLoaded(file)">
                    <el-image
                      class="detail-image-thumb"
                      :src="file.accessUrl"
                    :preview-src-list="detailImagePreviewList"
                    :initial-index="index"
                    fit="cover"
                    lazy
                  />
                </template>
                <div v-else class="detail-image-placeholder">
                  <span class="attachment-meta">缩略图未加载</span>
                  <el-button link type="primary" @click="loadDetailImageThumb(file)">加载缩略图</el-button>
                </div>
                <div class="detail-attachment-footer">
                  <span class="attachment-name">{{ file.fileName }}</span>
                  <div class="detail-image-actions">
                    <el-button link type="primary" @click="handleViewAttachment(file)">查看</el-button>
                    <el-button link type="primary" @click="handleDownloadAttachment(file)">下载</el-button>
                  </div>
                </div>
              </div>
            </div>
            <div v-if="detailFileAttachments.length" class="detail-file-list">
                <div
                  v-for="file in detailFileAttachments"
                  :key="attachmentKey(file)"
                  class="detail-file-item"
                >
                <div class="attachment-summary">
                  <div class="attachment-title-row">
                    <span class="attachment-icon" :class="`attachment-icon--${resolveAttachmentTypeMeta(file).tone}`">
                      <el-icon>
                        <component :is="resolveAttachmentTypeMeta(file).icon" />
                      </el-icon>
                    </span>
                    <span class="attachment-type-label">{{ resolveAttachmentTypeMeta(file).label }}</span>
                  </div>
                  <span class="attachment-name">{{ file.fileName }}</span>
                  <span class="attachment-meta">
                    {{ formatFileSize(file.fileSize) }}
                    <template v-if="file.fileType"> · {{ file.fileType }}</template>
                  </span>
                </div>
                <el-button link type="primary" @click="handleDownloadAttachment(file)">下载</el-button>
              </div>
            </div>
          </div>
          <span v-else>-</span>
        </el-descriptions-item>
      </el-descriptions>
    </el-dialog>

    <el-dialog v-model="imagePreview.visible" title="图片查看" width="72%" destroy-on-close append-to-body>
      <div class="image-preview-wrap">
        <img v-if="imagePreview.url" :src="imagePreview.url" :alt="imagePreview.name" class="image-preview-content" />
      </div>
      <template #footer>
        <el-button @click="imagePreview.visible = false">关闭</el-button>
        <el-button type="primary" @click="handleDownloadAttachment({ accessUrl: imagePreview.url, fileName: imagePreview.name })">
          下载
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { Document, Files, Picture, Reading } from '@element-plus/icons-vue'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { getUserSimple } from '../../api/system'
import {
  cleanupProjectTempAttachments,
  deleteProject,
  fetchProjectPageByForm,
  getProjectDetail,
  saveProjectForm,
  submitProjectById,
  uploadProjectAttachment
} from '../../api/project'
import { useSessionStore } from '../../stores/session'
import { useActivatedRefresh } from '../../utils/activated-refresh'
import { confirmAction, handleActionError, showError, showSuccess, showWarning } from '../../utils/feedback'
import { nowMs, reportPerfDuration } from '../../utils/perf-metrics'
import { createEmptyProjectForm, normalizeProjectForm } from '../../utils/project-models'
import { PROVINCE_OPTIONS, appendMissingOption, getCityOptions, getDistrictOptions, hasCity, hasDistrict } from '../../utils/region-options'

// 项目管理页：负责项目分页、编辑、详情、删除、提交审批和附件上传。
const statusOptions = [
  { label: '待提交', value: 0 },
  { label: '审批中', value: 1 },
  { label: '已通过', value: 2 },
  { label: '已驳回', value: 3 }
]

const queryForm = reactive({
  projectName: '',
  status: undefined,
  province: '',
  city: '',
  district: ''
})

const pagination = reactive({
  pageNum: 1,
  pageSize: 10,
  total: 0
})

const tableLoading = ref(false)
const tableData = ref([])
const tableFetchSeq = ref(0)
const editDialogRequestSeq = ref(0)
const detailDialogRequestSeq = ref(0)
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
  uploadingCount: 0,
  form: createEmptyForm()
})

const detailDialog = reactive({
  visible: false,
  loading: false
})
const imagePreview = reactive({
  visible: false,
  url: '',
  name: ''
})
const detailData = ref(createEmptyForm())
const pendingTempAttachmentIds = ref(new Set())
const uploadQueue = ref([])
const activeUploadCount = ref(0)
const detailLoadedImageIds = ref(new Set())
const rowActionLoading = reactive({
  submitId: null,
  deleteId: null
})

const CONTACT_PHONE_REGEX = /^[0-9-]{7,20}$/
const UPLOAD_CONCURRENCY_LIMIT = 2
const provinceOptions = PROVINCE_OPTIONS
const queryCityOptions = computed(() => getCityOptions(queryForm.province))
const queryDistrictOptions = computed(() => getDistrictOptions(queryForm.province, queryForm.city))
const editCityOptions = computed(() => appendMissingOption(getCityOptions(editDialog.form.province), editDialog.form.city))
const editDistrictOptions = computed(() =>
  appendMissingOption(getDistrictOptions(editDialog.form.province, editDialog.form.city), editDialog.form.district)
)
const detailImageAttachments = computed(() =>
  detailData.value.attachments.filter((item) => item.isImage && item.accessUrl)
)
const detailImagePreviewList = computed(() => detailImageAttachments.value.map((item) => item.accessUrl))
const detailFileAttachments = computed(() =>
  detailData.value.attachments.filter((item) => !item.isImage)
)
const visibleUploadTasks = computed(() =>
  uploadQueue.value.filter((item) => item.status === 'queued' || item.status === 'uploading')
)

function buildCurrentUserOption() {
  const userInfo = sessionStore.userInfo || {}
  const userId = userInfo.userId
  if (!userId) return null
  return {
    id: userId,
    username: userInfo.username || '',
    realName: userInfo.realName || userInfo.username || '',
    phone: userInfo.phone || ''
  }
}

function fillLeaderFromCurrentUser() {
  const currentUser = buildCurrentUserOption()
  if (!currentUser) return
  editDialog.form.leaderUserId = currentUser.id
  editDialog.form.leaderName = currentUser.realName || currentUser.username
  editDialog.form.leaderPhone = currentUser.phone || editDialog.form.leaderPhone || ''
}

function normalizeAttachment(file) {
  if (!file?.id) return null
  const numericSize = Number(file.fileSize ?? 0)
  return {
    id: file.id,
    fileName: String(file.fileName || '未命名附件'),
    fileType: String(file.fileType || ''),
    fileSize: Number.isFinite(numericSize) ? numericSize : 0,
    isImage: Boolean(file.isImage ?? file.image),
    accessUrl: String(file.accessUrl || '')
  }
}

function attachmentKey(file) {
  return String(file?.id || file?.fileName || '')
}

function upsertAttachment(file) {
  const normalizedFile = normalizeAttachment(file)
  if (!normalizedFile) return
  const currentAttachments = Array.isArray(editDialog.form.attachments) ? [...editDialog.form.attachments] : []
  const targetIndex = currentAttachments.findIndex((item) => String(item.id) === String(normalizedFile.id))
  if (targetIndex >= 0) {
    currentAttachments.splice(targetIndex, 1, normalizedFile)
  } else {
    currentAttachments.push(normalizedFile)
  }
  editDialog.form.attachments = currentAttachments
}

async function handleRemoveAttachment(file) {
  if (!file?.id) return
  const fileId = String(file.id)
  if (pendingTempAttachmentIds.value.has(fileId)) {
    try {
      await cleanupProjectTempAttachments(normalizeAttachmentIds([file.id]))
      pendingTempAttachmentIds.value.delete(fileId)
    } catch (error) {
      handleActionError(error, '临时附件清理失败，请稍后重试')
      return
    }
  }
  editDialog.form.attachments = editDialog.form.attachments.filter((item) => String(item.id) !== fileId)
}

function formatFileSize(value) {
  const fileSize = Number(value || 0)
  if (!Number.isFinite(fileSize) || fileSize <= 0) return '0 B'
  if (fileSize < 1024) return `${fileSize} B`
  if (fileSize < 1024 * 1024) return `${(fileSize / 1024).toFixed(1)} KB`
  if (fileSize < 1024 * 1024 * 1024) return `${(fileSize / 1024 / 1024).toFixed(1)} MB`
  return `${(fileSize / 1024 / 1024 / 1024).toFixed(1)} GB`
}

function normalizeAttachmentIds(fileIds) {
  return fileIds
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item))
}

function resolveAttachmentTypeMeta(file) {
  const fileName = String(file?.fileName || '').toLowerCase()
  const fileType = String(file?.fileType || '').toLowerCase()

  if (file?.isImage || fileType.startsWith('image/')) {
    return { icon: Picture, label: '图片附件', tone: 'image' }
  }
  if (fileType.includes('pdf') || fileName.endsWith('.pdf')) {
    return { icon: Reading, label: 'PDF 文件', tone: 'pdf' }
  }
  if (
    fileType.includes('word') ||
    fileType.includes('document') ||
    fileName.endsWith('.doc') ||
    fileName.endsWith('.docx') ||
    fileName.endsWith('.txt') ||
    fileName.endsWith('.rtf')
  ) {
    return { icon: Document, label: '文档文件', tone: 'doc' }
  }
  if (
    fileType.includes('sheet') ||
    fileType.includes('excel') ||
    fileType.includes('presentation') ||
    fileType.includes('powerpoint') ||
    fileType.includes('zip') ||
    fileType.includes('rar') ||
    fileName.endsWith('.xls') ||
    fileName.endsWith('.xlsx') ||
    fileName.endsWith('.ppt') ||
    fileName.endsWith('.pptx') ||
    fileName.endsWith('.zip') ||
    fileName.endsWith('.rar') ||
    fileName.endsWith('.7z')
  ) {
    return { icon: Files, label: '资料文件', tone: 'archive' }
  }
  return { icon: Document, label: '普通文件', tone: 'default' }
}

function ensureAttachmentUrl(file) {
  if (!file?.accessUrl) {
    showWarning('附件访问地址不存在，请刷新页面后重试')
    return ''
  }
  return file.accessUrl
}

function handleViewAttachment(file) {
  if (!file?.isImage) {
    showWarning('当前文件不支持查看，仅支持下载')
    return
  }
  const accessUrl = ensureAttachmentUrl(file)
  if (!accessUrl) return
  imagePreview.url = accessUrl
  imagePreview.name = file.fileName || '图片附件'
  imagePreview.visible = true
}

function handleDownloadAttachment(file) {
  const accessUrl = ensureAttachmentUrl(file)
  if (!accessUrl) return
  const link = document.createElement('a')
  link.href = accessUrl
  link.download = file?.fileName || '附件'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

function isDetailImageThumbLoaded(file) {
  if (!file?.id) return false
  return detailLoadedImageIds.value.has(String(file.id))
}

function loadDetailImageThumb(file) {
  if (!file?.id) return
  const nextIds = new Set(detailLoadedImageIds.value)
  nextIds.add(String(file.id))
  detailLoadedImageIds.value = nextIds
}

function loadAllDetailImageThumbs() {
  const nextIds = new Set(detailLoadedImageIds.value)
  detailImageAttachments.value.forEach((file) => {
    if (file?.id !== undefined && file?.id !== null) {
      nextIds.add(String(file.id))
    }
  })
  detailLoadedImageIds.value = nextIds
}

function createUploadTask(uploadRequest) {
  return {
    uid: String(uploadRequest.file?.uid || `${Date.now()}-${Math.random()}`),
    name: uploadRequest.file?.name || '未命名文件',
    size: Number(uploadRequest.file?.size || 0),
    progress: 0,
    status: 'queued',
    request: uploadRequest
  }
}

function removeUploadTask(taskUid) {
  uploadQueue.value = uploadQueue.value.filter((item) => item.uid !== taskUid)
}

function scheduleUploadQueue() {
  while (activeUploadCount.value < UPLOAD_CONCURRENCY_LIMIT) {
    const nextTask = uploadQueue.value.find((item) => item.status === 'queued')
    if (!nextTask) {
      return
    }
    void executeUploadTask(nextTask)
  }
}

async function executeUploadTask(task) {
  if (!task?.request?.file) return
  task.status = 'uploading'
  task.progress = Math.max(task.progress, 1)
  activeUploadCount.value += 1
  try {
    const res = await uploadProjectAttachment(task.request.file, {
      onProgress: (percent) => {
        task.progress = percent
        task.request.onProgress?.({ percent })
      }
    })
    task.progress = 100
    upsertAttachment(res.data)
    if (res.data?.id !== undefined && res.data?.id !== null) {
      pendingTempAttachmentIds.value.add(String(res.data.id))
    }
    task.request.onSuccess?.(res.data)
    showSuccess(`附件《${res.data?.fileName || task.name}》上传成功`)
  } catch (error) {
    task.request.onError?.(error)
    handleActionError(error, '附件上传失败，请稍后重试')
  } finally {
    activeUploadCount.value = Math.max(0, activeUploadCount.value - 1)
    editDialog.uploadingCount = Math.max(0, editDialog.uploadingCount - 1)
    removeUploadTask(task.uid)
    scheduleUploadQueue()
  }
}

function updateTableRowStatus(projectId, status) {
  const target = tableData.value.find((item) => String(item.id) === String(projectId))
  if (!target) return false
  target.status = status
  return true
}

function removeTableRow(projectId) {
  const originalLength = tableData.value.length
  tableData.value = tableData.value.filter((item) => String(item.id) !== String(projectId))
  if (tableData.value.length === originalLength) return false
  pagination.total = Math.max(0, Number(pagination.total || 0) - 1)
  return true
}

// 创建页面本地使用的默认项目表单。
function createEmptyForm() {
  return createEmptyProjectForm()
}

// 把接口返回或表格行数据统一规整成弹窗表单结构。
function normalizeProject(project) {
  return normalizeProjectForm(project, userOptions.value)
}

watch(
  () => queryForm.province,
  (value, previousValue) => {
    if (value === previousValue) return
    if (!hasCity(value, queryForm.city)) {
      queryForm.city = ''
      queryForm.district = ''
      return
    }
    if (!hasDistrict(value, queryForm.city, queryForm.district)) {
      queryForm.district = ''
    }
  }
)

watch(
  () => queryForm.city,
  (value, previousValue) => {
    if (value === previousValue) return
    if (!hasDistrict(queryForm.province, value, queryForm.district)) {
      queryForm.district = ''
    }
  }
)

watch(
  () => editDialog.form.province,
  (value, previousValue) => {
    if (value === previousValue) return
    if (!hasCity(value, editDialog.form.city)) {
      editDialog.form.city = ''
      editDialog.form.district = ''
      return
    }
    if (!hasDistrict(value, editDialog.form.city, editDialog.form.district)) {
      editDialog.form.district = ''
    }
  }
)

watch(
  () => editDialog.form.city,
  (value, previousValue) => {
    if (value === previousValue) return
    if (!hasDistrict(editDialog.form.province, value, editDialog.form.district)) {
      editDialog.form.district = ''
    }
  }
)

watch(
  () => editDialog.visible,
  (visible, previousVisible) => {
    if (visible || !previousVisible) return
    void cleanupPendingTempAttachments()
  }
)

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

  if (isNormalUser) {
    const currentUser = buildCurrentUserOption()
    userOptions.value = currentUser ? [currentUser] : []
    userOptionsLoaded.value = true
    return
  }

  const res = await getUserSimple()
  userOptions.value = Array.isArray(res.data) ? res.data : []
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
    markRefreshed()
  } finally {
    if (!silent && currentFetchSeq === tableFetchSeq.value) {
      tableLoading.value = false
    }
  }
}

const { markRefreshed } = useActivatedRefresh(() => fetchTableData({ silent: true }), {
  minIntervalMs: 10000,
  shouldRefresh: () =>
    !editDialog.visible &&
    !detailDialog.visible &&
    !editDialog.saving &&
    rowActionLoading.submitId === null &&
    rowActionLoading.deleteId === null &&
    !tableLoading.value
})

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
  queryForm.city = ''
  queryForm.district = ''
  pagination.pageNum = 1
  fetchTableData()
}

// 打开新增项目弹窗，并在普通用户场景下自动带出本人信息。
async function openCreateDialog() {
  const dialogStartAt = nowMs()
  let success = false
  let errorMessage = ''
  editDialog.mode = 'create'
  editDialog.form = createEmptyForm()
  editDialog.visible = true
  editDialog.loading = false
  editDialog.uploadingCount = 0
  pendingTempAttachmentIds.value = new Set()
  uploadQueue.value = []
  activeUploadCount.value = 0
  detailLoadedImageIds.value = new Set()
  try {
    if (isNormalUser) {
      fillLeaderFromCurrentUser()
    }
    if (!userOptionsLoaded.value) {
      void ensureUserOptionsLoaded().catch((error) => {
        errorMessage = error?.message || ''
      })
    }
    success = true
  } catch (error) {
    errorMessage = error?.message || ''
    throw error
  } finally {
    reportPerfDuration('project_manage_edit_dialog_open', dialogStartAt, {
      mode: 'create',
      success,
      errorMessage
    }, {
      normalLevel: 'info'
    })
  }
}

// 打开编辑弹窗，优先拉取详情后再回填表单。
async function openEditDialog(row) {
  if (!row?.id) {
    showWarning('项目ID不存在，无法编辑')
    return
  }
  const requestSeq = ++editDialogRequestSeq.value
  const dialogStartAt = nowMs()
  let optionsMs = 0
  let detailMs = 0
  let success = true
  let fallbackUsed = false
  let errorMessage = ''
  editDialog.mode = 'edit'
  editDialog.visible = true
  editDialog.loading = false
  editDialog.uploadingCount = 0
  pendingTempAttachmentIds.value = new Set()
  uploadQueue.value = []
  activeUploadCount.value = 0
  detailLoadedImageIds.value = new Set()
  editDialog.form = normalizeProject(row)
  try {
    const optionTask = (async () => {
      const optionsStartAt = nowMs()
      await ensureUserOptionsLoaded()
      optionsMs = Math.round(nowMs() - optionsStartAt)
    })()

    const detailTask = (async () => {
      const detailStartAt = nowMs()
      const res = await getProjectDetail(String(row.id))
      detailMs = Math.round(nowMs() - detailStartAt)
      if (requestSeq !== editDialogRequestSeq.value || !editDialog.visible || editDialog.mode !== 'edit') {
        return
      }
      editDialog.form = normalizeProject(res.data || row)
    })()

    const [optionResult, detailResult] = await Promise.allSettled([optionTask, detailTask])
    if (optionResult.status === 'rejected') {
      errorMessage = optionResult.reason?.message || errorMessage
    }
    if (detailResult.status === 'rejected') {
      success = false
      fallbackUsed = true
      errorMessage = detailResult.reason?.message || errorMessage
      showError('加载项目详情失败')
    }
  } catch (error) {
    success = false
    fallbackUsed = true
    errorMessage = error?.message || ''
  } finally {
    reportPerfDuration('project_manage_edit_dialog_open', dialogStartAt, {
      mode: 'edit',
      projectId: row.id,
      success,
      fallbackUsed,
      optionsMs,
      detailMs,
      errorMessage
    }, {
      normalLevel: 'info'
    })
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

// 处理附件上传并直接回填到表单。
async function handleAttachmentUpload(uploadRequest) {
  if (!uploadRequest?.file) {
    showWarning('未选择需要上传的文件')
    return
  }

  editDialog.uploadingCount += 1
  const task = createUploadTask(uploadRequest)
  uploadQueue.value = [...uploadQueue.value, task]
  scheduleUploadQueue()
}

async function cleanupPendingTempAttachments() {
  const fileIds = normalizeAttachmentIds(Array.from(pendingTempAttachmentIds.value))
  if (fileIds.length === 0) return
  pendingTempAttachmentIds.value = new Set()
  try {
    await cleanupProjectTempAttachments(fileIds)
  } catch (error) {
    pendingTempAttachmentIds.value = new Set(fileIds.map((item) => String(item)))
    handleActionError(error, '临时附件自动清理失败，请稍后重试')
  }
}

function handleBeforeCloseEditDialog(done) {
  if (editDialog.uploadingCount > 0) {
    showWarning('附件仍在上传中，请稍候后再关闭')
    return
  }
  done()
}

function handleCloseEditDialog() {
  if (editDialog.uploadingCount > 0) {
    showWarning('附件仍在上传中，请稍候后再关闭')
    return
  }
  editDialog.visible = false
}

// 保存项目表单。
async function handleSave() {
  if (!editDialog.form.projectName) {
    showWarning('项目名称不能为空')
    return
  }
  if (!editDialog.form.province || !editDialog.form.city || !editDialog.form.district) {
    showWarning('请完整选择省、市、区县')
    return
  }
  if (editDialog.uploadingCount > 0) {
    showWarning('附件仍在上传中，请稍候再保存')
    return
  }
  const leaderPhone = String(editDialog.form.leaderPhone || '').trim()
  if (leaderPhone && !CONTACT_PHONE_REGEX.test(leaderPhone)) {
    showWarning('联系电话格式不正确，请填写7到20位数字，可包含短横线')
    return
  }

  editDialog.saving = true
  try {
    await saveProjectForm(editDialog.form)
    pendingTempAttachmentIds.value = new Set()
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
  const requestSeq = ++detailDialogRequestSeq.value
  const detailStartAt = nowMs()
  let success = true
  let fallbackUsed = false
  let errorMessage = ''
  detailDialog.visible = true
  detailDialog.loading = true
  detailLoadedImageIds.value = new Set()
  detailData.value = normalizeProject(row)
  try {
    const res = await getProjectDetail(String(row.id))
    if (requestSeq !== detailDialogRequestSeq.value || !detailDialog.visible) {
      return
    }
    detailData.value = normalizeProject(res.data || row)
    if (!res.data) {
      fallbackUsed = true
      showWarning('未找到该项目详情，已展示列表数据')
    }
  } catch (error) {
    success = false
    fallbackUsed = true
    errorMessage = error?.message || ''
    showError('加载项目详情失败，已展示列表数据')
  } finally {
    if (requestSeq === detailDialogRequestSeq.value) {
      detailDialog.loading = false
    }
    reportPerfDuration('project_manage_detail_dialog_open', detailStartAt, {
      projectId: row.id,
      success,
      fallbackUsed,
      errorMessage
    }, {
      normalLevel: 'info'
    })
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
    if (!updateTableRowStatus(row.id, 1)) {
      await fetchTableData({ silent: true })
    } else {
      markRefreshed()
    }
  } catch (error) {
    handleActionError(error, '提交审批失败，请稍后重试')
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
    if (!removeTableRow(row.id)) {
      await fetchTableData({ silent: true })
    } else {
      markRefreshed()
    }
  } catch (error) {
    handleActionError(error, '删除项目失败，请稍后重试')
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

.attachment-panel {
  width: 100%;
}

.attachment-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.attachment-tip {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.5;
}

.attachment-list,
.detail-file-list,
.upload-queue-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.attachment-item,
.detail-file-item,
.upload-queue-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  background: var(--el-fill-color-extra-light);
}

.attachment-summary {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.attachment-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.attachment-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: var(--el-fill-color);
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
}

.attachment-icon--image {
  background: rgba(64, 158, 255, 0.12);
  color: var(--el-color-primary);
}

.attachment-icon--pdf {
  background: rgba(245, 108, 108, 0.12);
  color: var(--el-color-danger);
}

.attachment-icon--doc {
  background: rgba(103, 194, 58, 0.12);
  color: var(--el-color-success);
}

.attachment-icon--archive {
  background: rgba(230, 162, 60, 0.12);
  color: var(--el-color-warning);
}

.attachment-icon--default {
  background: var(--el-fill-color);
  color: var(--el-text-color-secondary);
}

.attachment-type-label {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.attachment-name {
  color: var(--el-color-primary);
  cursor: pointer;
  word-break: break-all;
}

.attachment-meta {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.attachment-actions {
  flex-shrink: 0;
}

.upload-progress-wrap {
  width: 180px;
  flex-shrink: 0;
}

.attachment-empty {
  padding: 16px 14px;
  border: 1px dashed var(--el-border-color);
  border-radius: 8px;
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color-extra-light);
}

.detail-attachment-wrap {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.detail-image-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
}

.detail-image-toolbar {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.detail-image-card {
  padding: 12px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 10px;
  background: var(--el-fill-color-extra-light);
}

.detail-image-thumb {
  width: 100%;
  height: 140px;
  border-radius: 8px;
  overflow: hidden;
  background: var(--el-fill-color);
}

.detail-image-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  height: 140px;
  border-radius: 8px;
  border: 1px dashed var(--el-border-color);
  background: linear-gradient(135deg, var(--el-fill-color), var(--el-fill-color-light));
}

.detail-attachment-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 10px;
}

.detail-image-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.image-preview-wrap {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 320px;
  background: var(--el-fill-color-extra-light);
  border-radius: 10px;
  padding: 16px;
}

.image-preview-content {
  max-width: 100%;
  max-height: 72vh;
  object-fit: contain;
}

.attachment-name.is-clickable {
  cursor: pointer;
}

@media (max-width: 768px) {
  .attachment-item,
  .detail-file-item,
  .detail-attachment-footer,
  .upload-queue-item,
  .detail-image-toolbar,
  .detail-image-actions {
    flex-direction: column;
    align-items: flex-start;
  }

  .detail-image-list {
    grid-template-columns: 1fr;
  }

  .upload-progress-wrap {
    width: 100%;
  }
}
</style>
