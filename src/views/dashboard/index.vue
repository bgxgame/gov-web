<template>
  <div class="dashboard-container">
    <el-card class="map-card" shadow="never">
      <template #header>
        <div class="map-header">
          <div class="header-left">
            <el-icon><Location /></el-icon>
            <span class="title">项目分布地理看板</span>
          </div>
          <div class="header-right">
            <el-input v-model="filters.province" placeholder="省份" clearable class="filter-input" />
            <el-input v-model="filters.city" placeholder="城市" clearable class="filter-input" />
            <el-input v-model="filters.district" placeholder="区县" clearable class="filter-input" />
            <el-button type="primary" @click="loadScatterData">筛选</el-button>
            <el-button @click="resetFilters">重置</el-button>
          </div>
        </div>
      </template>
      <div id="project-map" class="chart-div"></div>
    </el-card>

    <el-drawer v-model="detailDrawer.visible" title="项目详情" size="460px">
      <el-descriptions :column="1" border>
        <el-descriptions-item label="项目名称">{{ detailDrawer.data.projectName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="项目编号">{{ detailDrawer.data.projectCode || '-' }}</el-descriptions-item>
        <el-descriptions-item label="项目地址">{{ detailDrawer.data.address || '-' }}</el-descriptions-item>
        <el-descriptions-item label="负责人">{{ detailDrawer.data.leaderName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="联系电话">{{ detailDrawer.data.leaderPhone || '-' }}</el-descriptions-item>
        <el-descriptions-item label="省市区">
          {{ [detailDrawer.data.province, detailDrawer.data.city, detailDrawer.data.district].filter(Boolean).join(' / ') || '-' }}
        </el-descriptions-item>
      </el-descriptions>
    </el-drawer>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import axios from 'axios'
import { getProjectDetail, getProjectMapList } from '../../api/project'

let chart = null

const filters = reactive({
  province: '',
  city: '',
  district: ''
})

const detailDrawer = reactive({
  visible: false,
  data: {}
})

async function initMap() {
  const res = await axios.get('/map-data/610000.json')
  echarts.registerMap('shaanxi', res.data)
}

async function loadScatterData() {
  if (!chart) return
  const res = await getProjectMapList({
    province: filters.province || undefined,
    city: filters.city || undefined,
    district: filters.district || undefined
  })

  const scatterData = (res.data || [])
    .map((item) => {
      const lng = Number(item.longitude)
      const lat = Number(item.latitude)
      return {
        name: item.projectName,
        value: [lng, lat, item.id, item.address]
      }
    })
    .filter((item) => !Number.isNaN(item.value[0]) && !Number.isNaN(item.value[1]))

  chart.setOption({
    tooltip: {
      trigger: 'item',
      formatter: (params) => {
        if (params.seriesType !== 'effectScatter') return params.name
        return `<div style="padding:6px">
          <b style="color:#409EFF">${params.name}</b><br/>
          地址：${params.value[3] || '暂无'}<br/>
          坐标：${params.value[0]}, ${params.value[1]}
        </div>`
      }
    },
    geo: {
      map: 'shaanxi',
      roam: true,
      label: { show: true, color: '#666', fontSize: 10 },
      itemStyle: {
        areaColor: '#f3f4f6',
        borderColor: '#409EFF',
        borderWidth: 0.5
      },
      emphasis: { itemStyle: { areaColor: '#a5d1ff' } }
    },
    series: [
      {
        name: '项目点',
        type: 'effectScatter',
        coordinateSystem: 'geo',
        data: scatterData,
        symbolSize: 14,
        showEffectOn: 'render',
        rippleEffect: { brushType: 'stroke', scale: 4 },
        itemStyle: { color: '#ff4d4f', shadowBlur: 10, shadowColor: '#333' }
      }
    ]
  })
}

async function openProjectDetail(projectId) {
  try {
    const res = await getProjectDetail(projectId)
    detailDrawer.data = res.data || {}
    detailDrawer.visible = true
  } catch (error) {
    ElMessage.error('加载项目详情失败')
  }
}

function handleResize() {
  if (chart) chart.resize()
}

function resetFilters() {
  filters.province = ''
  filters.city = ''
  filters.district = ''
  loadScatterData()
}

onMounted(async () => {
  chart = echarts.init(document.getElementById('project-map'))
  await initMap()
  await loadScatterData()
  chart.on('click', (params) => {
    if (params.seriesType === 'effectScatter') {
      openProjectDetail(params.value[2])
    }
  })
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.dashboard-container {
  height: 100%;
  width: 100%;
  overflow: hidden;
}

.map-card {
  height: 100%;
  border: none;
  display: flex;
  flex-direction: column;
}

.map-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.title {
  font-weight: 600;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-input {
  width: 140px;
}

.chart-div {
  width: 100%;
  height: calc(100vh - 65px);
}

:deep(.el-card__body) {
  padding: 0 !important;
  flex: 1;
  overflow: hidden;
}
</style>
