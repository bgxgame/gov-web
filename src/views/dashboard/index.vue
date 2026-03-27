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
            <el-select v-model="filters.province" clearable placeholder="省份" class="filter-input" @change="onProvinceChange">
              <el-option v-for="item in provinceOptions" :key="item" :label="item" :value="item" />
            </el-select>
            <el-select v-model="filters.city" clearable placeholder="城市" class="filter-input" @change="onCityChange">
              <el-option v-for="item in cityOptions" :key="item" :label="item" :value="item" />
            </el-select>
            <el-select v-model="filters.district" clearable placeholder="区县" class="filter-input" @change="loadScatterData">
              <el-option v-for="item in districtOptions" :key="item" :label="item" :value="item" />
            </el-select>
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
import { onMounted, onUnmounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Location } from '@element-plus/icons-vue'
import axios from 'axios'
import * as echarts from 'echarts'
import { getProjectDetail, getProjectMapList } from '../../api/project'

let chart = null
let mapGeoJson = null

const filters = reactive({
  province: '',
  city: '',
  district: ''
})

const provinceOptions = ref([])
const cityOptions = ref([])
const districtOptions = ref([])

const allMapRows = ref([])

const detailDrawer = reactive({
  visible: false,
  data: {}
})

async function initMap() {
  const res = await axios.get('/map-data/610000.json')
  mapGeoJson = res.data
  echarts.registerMap('shaanxi', mapGeoJson)
}

function buildRegionOptions(rows) {
  const provinces = new Set()
  const cities = new Set()
  const districts = new Set()

  rows.forEach((item) => {
    if (item.province) provinces.add(item.province)
    if (item.city) cities.add(item.city)
    if (item.district) districts.add(item.district)
  })

  provinceOptions.value = [...provinces]
  cityOptions.value = [...cities]
  districtOptions.value = [...districts]
}

function onProvinceChange() {
  filters.city = ''
  filters.district = ''
  const citySet = new Set()
  allMapRows.value.forEach((item) => {
    if (!filters.province || item.province === filters.province) {
      if (item.city) citySet.add(item.city)
    }
  })
  cityOptions.value = [...citySet]
  districtOptions.value = []
  loadScatterData()
}

function onCityChange() {
  filters.district = ''
  const districtSet = new Set()
  allMapRows.value.forEach((item) => {
    const matchProvince = !filters.province || item.province === filters.province
    const matchCity = !filters.city || item.city === filters.city
    if (matchProvince && matchCity && item.district) {
      districtSet.add(item.district)
    }
  })
  districtOptions.value = [...districtSet]
  loadScatterData()
}

async function loadScatterData() {
  if (!chart) return
  const res = await getProjectMapList({
    province: filters.province || undefined,
    city: filters.city || undefined,
    district: filters.district || undefined
  })

  const rows = res.data || []
  if (!filters.province && !filters.city && !filters.district) {
    allMapRows.value = rows
    buildRegionOptions(rows)
  }

  const scatterData = rows
    .map((item) => {
      const point = resolvePoint(item)
      const lng = Number(point[0])
      const lat = Number(point[1])
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
        return `<div style="padding:6px"><b style="color:#409EFF">${params.name}</b><br/>地址：${params.value[3] || '暂无'}<br/>坐标：${params.value[0]}, ${params.value[1]}</div>`
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
        name: '项目点位',
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

function normalizeRegionName(name) {
  if (!name) return ''
  return String(name).replace(/省|市|区|县|自治州|地区|特别行政区/g, '')
}

function resolvePoint(item) {
  const rawLng = Number(item.longitude)
  const rawLat = Number(item.latitude)
  if (!Number.isNaN(rawLng) && !Number.isNaN(rawLat) && rawLng !== 0 && rawLat !== 0) {
    return [rawLng, rawLat]
  }

  const cityCenterMap = {
    西安: [108.9398, 34.3416],
    宝鸡: [107.2373, 34.3619],
    咸阳: [108.7051, 34.3334],
    铜川: [108.945, 34.8967],
    渭南: [109.5, 34.4999],
    延安: [109.4897, 36.5853],
    榆林: [109.7341, 38.2858],
    汉中: [107.0286, 33.0777],
    安康: [109.0293, 32.6903],
    商洛: [109.9398, 33.8683]
  }

  const districtName = normalizeRegionName(item.district)
  const cityName = normalizeRegionName(item.city)
  const provinceName = normalizeRegionName(item.province)

  if (mapGeoJson?.features?.length) {
    const feature = mapGeoJson.features.find((f) => {
      const featureName = normalizeRegionName(f?.properties?.name || f?.name)
      return featureName === districtName || featureName === cityName
    })
    if (feature?.properties?.center?.length >= 2) {
      return feature.properties.center
    }
    if (feature?.properties?.cp?.length >= 2) {
      return feature.properties.cp
    }
  }

  if (cityName && cityCenterMap[cityName]) {
    return cityCenterMap[cityName]
  }

  if (provinceName === '陕西') {
    return [108.95, 34.27]
  }
  return [108.95, 34.27]
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
  buildRegionOptions(allMapRows.value)
  loadScatterData()
}

onMounted(async () => {
  const container = document.getElementById('project-map')
  if (!container) {
    ElMessage.error('地图容器初始化失败')
    return
  }
  chart = echarts.init(container)
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
  if (chart) {
    chart.dispose()
    chart = null
  }
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
