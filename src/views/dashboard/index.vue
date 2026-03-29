<template>
  <div class="dashboard-container">
    <el-card v-loading="mapLoading" class="map-card" shadow="never">
      <template #header>
        <div class="map-header">
          <div class="header-left">
            <el-icon><Location /></el-icon>
            <span class="title">项目分布地理看板（仅展示审批通过）</span>
          </div>
          <div class="header-right">
            <el-tag type="info">当前层级：{{ levelLabel }}</el-tag>
            <el-button v-if="viewLevel !== 'city'" @click="goBack">返回上级</el-button>
            <el-button :loading="mapReloading" @click="reloadMapData">刷新</el-button>
          </div>
        </div>
      </template>

      <div class="chart-shell">
        <div ref="mapContainerRef" class="chart-div"></div>
        <div v-if="!mapLoading && !hasMapData" class="map-empty-state">
          <el-empty description="当前权限范围内暂无已通过项目" />
        </div>
      </div>
    </el-card>

    <el-drawer v-model="detailDrawer.visible" title="项目详情" size="460px">
      <div v-loading="detailDrawer.loading">
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
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { computed, nextTick, onActivated, onDeactivated, onMounted, onUnmounted, reactive, ref } from 'vue'
import { Location } from '@element-plus/icons-vue'
import { fetchProjectMapListByFilters, getProjectDetail } from '../../api/project'
import { showError } from '../../utils/feedback'

/**
 * 职责：展示已审批通过项目的地图分布，并支持城市、区县、项目三级下钻。
 * 为什么存在：首页需要用低成本的地图视图展示项目整体分布，同时控制图表初始化与重绘开销。
 * 关键输入输出：输入为地图点位接口、GeoJSON 资源和点击事件；输出为地图渲染结果和项目详情抽屉。
 * 关联链路：登录后默认首页 -> 地图点位聚合 -> 点击下钻 -> 查看项目详情。
 */
const ROOT_ADCODE = '610000'
const ROOT_MAP_KEY = `map_${ROOT_ADCODE}`
const MAP_CLICK_EVENT = 'click'

const mapContainerRef = ref(null)
const mapLoading = ref(false)
const mapReloading = ref(false)
const viewLevel = ref('city')
const selectedCity = ref('')
const selectedDistrict = ref('')
const currentMapKey = ref(ROOT_MAP_KEY)
const allApprovedRows = ref([])

const detailDrawer = reactive({
  visible: false,
  loading: false,
  data: {}
})

let chart = null
let echartsModulesPromise = null
let resizeTimer = null
let reloadTimer = null
let resizeListenerBound = false
const mapCache = new Map()
const echartsRuntime = {
  init: null,
  registerMap: null
}

const hasMapData = computed(() => allApprovedRows.value.length > 0)
const levelLabel = computed(() => {
  if (viewLevel.value === 'city') return '市级总览'
  if (viewLevel.value === 'district') return `${selectedCity.value || '-'} 区县`
  return `${selectedCity.value || '-'} / ${selectedDistrict.value || '-'} 项目点位`
})

async function ensureEchartsReady() {
  if (echartsRuntime.init && echartsRuntime.registerMap) return echartsRuntime
  if (!echartsModulesPromise) {
    echartsModulesPromise = Promise.all([
      import('echarts/core'),
      import('echarts/components'),
      import('echarts/charts'),
      import('echarts/renderers')
    ]).then(([core, components, charts, renderers]) => {
      core.use([
        components.GeoComponent,
        components.TooltipComponent,
        charts.EffectScatterChart,
        renderers.CanvasRenderer
      ])
      echartsRuntime.init = core.init
      echartsRuntime.registerMap = core.registerMap
      return echartsRuntime
    })
  }
  return echartsModulesPromise
}

function normalizeRegionName(name) {
  if (!name) return ''
  return String(name).replace(/省|市|区|县|自治州|地区|特别行政区/g, '')
}

async function loadMapGeoJson(adcode) {
  if (mapCache.has(adcode)) return mapCache.get(adcode)
  try {
    const response = await fetch(`/map-data/${adcode}.json`)
    if (!response.ok) return null
    const geoJson = await response.json()
    mapCache.set(adcode, geoJson)
    return geoJson
  } catch (error) {
    return null
  }
}

async function ensureMapRegistered(adcode, mapKey) {
  const runtime = await ensureEchartsReady()
  const geoJson = await loadMapGeoJson(adcode)
  if (!geoJson) return false
  runtime.registerMap(mapKey, geoJson)
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
  const regionMap = new Map()
  rows.forEach((item) => {
    const key = item[regionKey]
    if (!key) return
    if (!regionMap.has(key)) {
      regionMap.set(key, { name: key, count: 0, sample: item })
    }
    regionMap.get(key).count += 1
  })
  return Array.from(regionMap.values())
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

  const rows = getRowsByLevel()
  const isCityLevel = viewLevel.value === 'city'
  const isDistrictLevel = viewLevel.value === 'district'
  const isProjectLevel = viewLevel.value === 'project'
  let scatterData = []

  if (isCityLevel) {
    scatterData = aggregateByRegion(rows, 'city').map((item) => {
      const point = resolvePoint(item.sample)
      return {
        name: item.name,
        value: [Number(point[0]), Number(point[1]), item.count],
        meta: { city: item.name }
      }
    })
  } else if (isDistrictLevel) {
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

  const shouldShowLabels = isCityLevel || (isDistrictLevel && scatterData.length <= 18)
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
      label: { show: false },
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
          if (isProjectLevel) return 10
          return Math.min(18, 8 + Number(val[2] || 0) * 1.1)
        },
        label: {
          show: shouldShowLabels,
          position: 'right',
          formatter: (params) => params.name,
          color: '#1f2937',
          fontSize: 12,
          backgroundColor: 'rgba(255,255,255,0.85)',
          padding: [2, 6],
          borderRadius: 8
        },
        showEffectOn: isProjectLevel ? 'render' : 'emphasis',
        rippleEffect: isProjectLevel ? { brushType: 'stroke', scale: 3 } : undefined,
        itemStyle: { color: '#ff4d4f', shadowBlur: isProjectLevel ? 10 : 4, shadowColor: '#333' }
      }
    ]
  })
}

async function fetchApprovedMapRows() {
  const res = await fetchProjectMapListByFilters({ province: '陕西省' })
  let rows = res.data || []
  if (rows.length === 0) {
    const fallback = await fetchProjectMapListByFilters()
    rows = fallback.data || []
  }
  allApprovedRows.value = rows
}

async function performReload() {
  await fetchApprovedMapRows()
  await renderMap()
}

function reloadMapData() {
  if (reloadTimer || mapReloading.value) return
  reloadTimer = window.setTimeout(async () => {
    reloadTimer = null
    mapReloading.value = true
    try {
      await performReload()
    } finally {
      mapReloading.value = false
    }
  }, 180)
}

async function openProjectDetail(projectId) {
  detailDrawer.visible = true
  detailDrawer.loading = true
  try {
    const res = await getProjectDetail(projectId)
    detailDrawer.data = res.data || {}
  } catch (error) {
    detailDrawer.visible = false
    showError('加载项目详情失败')
  } finally {
    detailDrawer.loading = false
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
  if (resizeTimer) {
    clearTimeout(resizeTimer)
  }
  resizeTimer = window.setTimeout(() => {
    chart?.resize()
  }, 120)
}

function bindChartEvents() {
  if (!chart) return
  chart.off(MAP_CLICK_EVENT)
  chart.on(MAP_CLICK_EVENT, async (params) => {
    if (params.seriesType !== 'scatter' && params.seriesType !== 'effectScatter') return
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
}

function ensureResizeListener(active) {
  if (active && !resizeListenerBound) {
    window.addEventListener('resize', handleResize)
    resizeListenerBound = true
    return
  }
  if (!active && resizeListenerBound) {
    window.removeEventListener('resize', handleResize)
    resizeListenerBound = false
  }
}

async function setupChart() {
  await nextTick()
  await new Promise((resolve) => requestAnimationFrame(resolve))

  const container = mapContainerRef.value
  if (!container) {
    showError('地图容器初始化失败')
    return
  }

  const runtime = await ensureEchartsReady()
  chart = runtime.init(container)
  const rootLoaded = await ensureMapRegistered(ROOT_ADCODE, ROOT_MAP_KEY)
  if (!rootLoaded) {
    showError('陕西地图资源加载失败')
    return
  }
  currentMapKey.value = ROOT_MAP_KEY

  bindChartEvents()
  await performReload()
}

onMounted(async () => {
  mapLoading.value = true
  try {
    await setupChart()
    ensureResizeListener(true)
  } finally {
    mapLoading.value = false
  }
})

onActivated(() => {
  ensureResizeListener(true)
  nextTick(() => {
    chart?.resize()
  })
})

onDeactivated(() => {
  ensureResizeListener(false)
})

onUnmounted(() => {
  ensureResizeListener(false)
  if (resizeTimer) {
    clearTimeout(resizeTimer)
  }
  if (reloadTimer) {
    clearTimeout(reloadTimer)
  }
  if (chart) {
    chart.off(MAP_CLICK_EVENT)
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

.chart-shell {
  position: relative;
  width: 100%;
  height: 100%;
}

.chart-div {
  width: 100%;
  height: calc(100vh - 65px);
}

.map-empty-state {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.85);
}

:deep(.el-card__body) {
  padding: 0 !important;
  flex: 1;
  overflow: hidden;
}
</style>
