<template>
  <div class="dashboard-container">
    <el-card class="map-card" shadow="never">
      <template #header>
        <div class="map-header">
          <div class="header-left">
            <el-icon><Location /></el-icon>
            <span class="title">项目分布地理看板（仅展示审批通过）</span>
          </div>
          <div class="header-right">
            <el-tag type="info">当前层级：{{ levelLabel }}</el-tag>
            <el-button v-if="viewLevel !== 'city'" @click="goBack">返回上级</el-button>
            <el-button @click="reloadMapData">刷新</el-button>
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
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Location } from '@element-plus/icons-vue'
import axios from 'axios'
import { use, init, registerMap } from 'echarts/core'
import { GeoComponent, TooltipComponent } from 'echarts/components'
import { EffectScatterChart } from 'echarts/charts'
import { CanvasRenderer } from 'echarts/renderers'
import { getProjectDetail, getProjectMapList } from '../../api/project'

use([GeoComponent, TooltipComponent, EffectScatterChart, CanvasRenderer])

const ROOT_ADCODE = '610000'
const ROOT_MAP_KEY = `map_${ROOT_ADCODE}`

let chart = null
const mapCache = new Map()

const viewLevel = ref('city')
const selectedCity = ref('')
const selectedDistrict = ref('')
const currentMapKey = ref(ROOT_MAP_KEY)

const allApprovedRows = ref([])

const detailDrawer = reactive({
  visible: false,
  data: {}
})

const levelLabel = computed(() => {
  if (viewLevel.value === 'city') return '市级总览'
  if (viewLevel.value === 'district') return `${selectedCity.value || '-'} 区县`
  return `${selectedCity.value || '-'} / ${selectedDistrict.value || '-'} 项目点位`
})

function normalizeRegionName(name) {
  if (!name) return ''
  return String(name).replace(/省|市|区|县|自治州|地区|特别行政区/g, '')
}

function getFeatureCenter(feature) {
  if (feature?.properties?.center?.length >= 2) return feature.properties.center
  if (feature?.properties?.cp?.length >= 2) return feature.properties.cp
  return null
}

async function loadMapGeoJson(adcode) {
  if (mapCache.has(adcode)) return mapCache.get(adcode)
  try {
    const res = await axios.get(`/map-data/${adcode}.json`)
    mapCache.set(adcode, res.data)
    return res.data
  } catch (error) {
    return null
  }
}

async function ensureMapRegistered(adcode, mapKey) {
  const geoJson = await loadMapGeoJson(adcode)
  if (!geoJson) return false
  registerMap(mapKey, geoJson)
  return true
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

  const cityName = normalizeRegionName(item.city)
  if (cityName && cityCenterMap[cityName]) return cityCenterMap[cityName]
  return [108.95, 34.27]
}

function aggregateByRegion(rows, regionKey) {
  const map = new Map()
  rows.forEach((item) => {
    const key = item[regionKey]
    if (!key) return
    if (!map.has(key)) {
      map.set(key, { name: key, count: 0, sample: item })
    }
    map.get(key).count += 1
  })
  return Array.from(map.values())
}

function getRowsByLevel() {
  if (viewLevel.value === 'city') return allApprovedRows.value
  if (viewLevel.value === 'district') {
    return allApprovedRows.value.filter((item) => item.city === selectedCity.value)
  }
  return allApprovedRows.value.filter(
    (item) => item.city === selectedCity.value && item.district === selectedDistrict.value
  )
}

async function renderMap() {
  if (!chart) return

  let rows = getRowsByLevel()
  let scatterData = []
  const isCityLevel = viewLevel.value === 'city'
  const isDistrictLevel = viewLevel.value === 'district'
  const isProjectLevel = viewLevel.value === 'project'

  if (viewLevel.value === 'city') {
    scatterData = aggregateByRegion(rows, 'city').map((item) => {
      const point = resolvePoint(item.sample)
      return {
        name: item.name,
        value: [Number(point[0]), Number(point[1]), item.count],
        meta: { city: item.name }
      }
    })
  } else if (viewLevel.value === 'district') {
    scatterData = aggregateByRegion(rows, 'district').map((item) => {
      const point = resolvePoint(item.sample)
      return {
        name: item.name,
        value: [Number(point[0]), Number(point[1]), item.count],
        meta: { city: selectedCity.value, district: item.name }
      }
    })
  } else {
    scatterData = rows.map((item) => {
      const point = resolvePoint(item)
      return {
        name: item.projectName,
        value: [Number(point[0]), Number(point[1]), item.id, item.address],
        meta: { projectId: item.id }
      }
    })
  }

  chart.setOption({
    tooltip: {
      trigger: 'item',
      formatter: (params) => {
        if (isProjectLevel) {
          return `<div style="padding:6px"><b style="color:#409EFF">${params.name}</b><br/>地址：${params.value[3] || '暂无'}</div>`
        }
        return `<div style="padding:6px"><b style="color:#409EFF">${params.name}</b><br/>项目数：${params.value[2] || 0}</div>`
      }
    },
    geo: {
      map: currentMapKey.value,
      roam: true,
      label: { show: !isCityLevel, color: '#666', fontSize: 10 },
      itemStyle: {
        areaColor: '#f3f4f6',
        borderColor: isCityLevel ? '#d5e5ff' : '#409EFF',
        borderWidth: isCityLevel ? 0.2 : 0.5
      },
      emphasis: { itemStyle: { areaColor: '#a5d1ff' } }
    },
    series: [
      {
        name: '项目点位',
        type: 'effectScatter',
        coordinateSystem: 'geo',
        data: scatterData,
        symbolSize: (val) => {
          if (isProjectLevel) return 12
          return Math.min(20, 8 + Number(val[2] || 0) * 1.2)
        },
        label: {
          show: isCityLevel || isDistrictLevel,
          position: 'right',
          formatter: (params) => params.name,
          color: '#1f2937',
          fontSize: 12,
          backgroundColor: 'rgba(255,255,255,0.85)',
          padding: [2, 6],
          borderRadius: 8
        },
        showEffectOn: 'render',
        rippleEffect: { brushType: 'stroke', scale: 4 },
        itemStyle: { color: '#ff4d4f', shadowBlur: 10, shadowColor: '#333' }
      }
    ]
  })
}

async function fetchApprovedMapRows() {
  const res = await getProjectMapList({ province: '陕西省' })
  let rows = res.data || []
  if (rows.length === 0) {
    const fallback = await getProjectMapList()
    rows = fallback.data || []
  }
  allApprovedRows.value = rows
}

async function reloadMapData() {
  await fetchApprovedMapRows()
  await renderMap()
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

async function drillDownByCity(cityName) {
  selectedCity.value = cityName
  selectedDistrict.value = ''
  viewLevel.value = 'district'
  currentMapKey.value = ROOT_MAP_KEY
  await renderMap()
}

async function drillDownByDistrict(districtName) {
  selectedDistrict.value = districtName
  viewLevel.value = 'project'
  await renderMap()
}

async function goBack() {
  if (viewLevel.value === 'project') {
    viewLevel.value = 'district'
    selectedDistrict.value = ''
    await renderMap()
    return
  }
  viewLevel.value = 'city'
  selectedCity.value = ''
  selectedDistrict.value = ''
  currentMapKey.value = ROOT_MAP_KEY
  await renderMap()
}

function handleResize() {
  if (chart) chart.resize()
}

onMounted(async () => {
  const container = document.getElementById('project-map')
  if (!container) {
    ElMessage.error('地图容器初始化失败')
    return
  }

  chart = init(container)

  const rootLoaded = await ensureMapRegistered(ROOT_ADCODE, ROOT_MAP_KEY)
  if (!rootLoaded) {
    ElMessage.error('陕西地图资源加载失败')
    return
  }
  currentMapKey.value = ROOT_MAP_KEY

  await reloadMapData()

  chart.on('click', async (params) => {
    if (params.seriesType !== 'effectScatter') return
    if (viewLevel.value === 'city') {
      await drillDownByCity(params.name)
      return
    }
    if (viewLevel.value === 'district') {
      await drillDownByDistrict(params.name)
      return
    }
    await openProjectDetail(params.data?.meta?.projectId || params.value?.[2])
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
