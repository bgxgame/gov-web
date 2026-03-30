<template>
  <div class="dashboard-container">
    <el-card v-loading="pageBusy" class="map-card" shadow="never">
      <template #header>
        <div class="map-header">
          <div class="header-main">
            <div class="header-title-row">
              <el-icon><Location /></el-icon>
              <span class="title">项目分布地理看板</span>
              <el-tag type="success" effect="light">仅展示审批通过项目</el-tag>
            </div>
            <el-breadcrumb separator="/" class="breadcrumb">
              <el-breadcrumb-item>
                <button class="crumb-button" type="button" :disabled="viewLevel === 'province'" @click="resetToProvince">
                  {{ ROOT_PROVINCE_NAME }}
                </button>
              </el-breadcrumb-item>
              <el-breadcrumb-item v-if="selectedCity">
                <button class="crumb-button" type="button" :disabled="viewLevel === 'city'" @click="backToCity">
                  {{ selectedCity }}
                </button>
              </el-breadcrumb-item>
              <el-breadcrumb-item v-if="selectedDistrict">
                <span>{{ selectedDistrict }}</span>
              </el-breadcrumb-item>
            </el-breadcrumb>
            <div class="summary-row">
              <el-tag type="info">当前层级：{{ levelLabel }}</el-tag>
              <el-tag type="primary">当前项目数：{{ currentProjectCount }}</el-tag>
              <el-tag type="warning">省级可见项目：{{ provinceProjectCount }}</el-tag>
            </div>
          </div>
          <div class="header-actions">
            <el-button v-if="viewLevel !== 'province'" @click="goBack">返回上级</el-button>
            <el-button :icon="RefreshRight" :loading="refreshing" @click="reloadCurrentView">刷新</el-button>
          </div>
        </div>
      </template>

      <div class="content-shell">
        <section class="chart-section">
          <div class="chart-shell">
            <div ref="mapContainerRef" class="chart-div"></div>
            <div v-if="mapErrorMessage" class="overlay-card overlay-card--error">
              <div class="overlay-title">地图加载失败</div>
              <div class="overlay-text">{{ mapErrorMessage }}</div>
              <el-button type="primary" size="small" @click="reloadCurrentView">重新加载</el-button>
            </div>
            <div v-else-if="!pageBusy && currentProjectCount === 0" class="overlay-card overlay-card--empty">
              <div class="overlay-title">当前层级暂无项目</div>
              <div class="overlay-text">当前权限范围内暂时无审批通过项目，仍可继续查看行政区边界。</div>
            </div>
          </div>
        </section>

        <aside class="insight-panel">
          <div class="panel-header">
            <div class="panel-title">{{ panelTitle }}</div>
            <div class="panel-subtitle">{{ panelSubtitle }}</div>
          </div>
          <div class="panel-stats">
            <article class="stat-card">
              <span class="stat-label">{{ viewLevel === 'county' ? '项目数量' : '区域数量' }}</span>
              <strong class="stat-value">{{ panelRows.length }}</strong>
            </article>
            <article class="stat-card">
              <span class="stat-label">审批通过项目</span>
              <strong class="stat-value">{{ currentProjectCount }}</strong>
            </article>
            <article class="stat-card">
              <span class="stat-label">{{ viewLevel === 'county' ? '项目数量' : '区域数量' }}</span>
              <strong class="stat-value">{{ secondaryStatValue }}</strong>
            </article>
          </div>

          <div class="panel-list" data-role="insight-list">
            <div v-if="panelRows.length === 0" class="panel-empty">
              {{ panelEmptyText }}
            </div>
            <button
              v-for="item in panelRows"
              :key="item.key"
              type="button"
              class="panel-item"
              :class="{ 'panel-item--active': item.active }"
              @click="handlePanelItemClick(item)"
            >
              <div class="panel-item__main">
                <div class="panel-item__title">{{ item.title }}</div>
                <div class="panel-item__subtitle">{{ item.subtitle }}</div>
              </div>
              <div class="panel-item__side">
                <strong class="panel-item__count">{{ item.count }}</strong>
                <span class="panel-item__hint">{{ item.hint }}</span>
              </div>
            </button>
          </div>
        </aside>
      </div>
    </el-card>

    <el-dialog v-model="detailDialog.visible" title="项目详情" width="720px" destroy-on-close>
      <div v-loading="detailDialog.loading">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="项目名称">{{ detailDialog.data.projectName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="项目编号">{{ detailDialog.data.projectCode || '-' }}</el-descriptions-item>
          <el-descriptions-item label="项目地址" :span="2">{{ detailDialog.data.address || '-' }}</el-descriptions-item>
          <el-descriptions-item label="负责人">{{ detailDialog.data.leaderName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="联系电话">{{ detailDialog.data.leaderPhone || '-' }}</el-descriptions-item>
          <el-descriptions-item label="所在区域" :span="2">
            {{ [detailDialog.data.province, detailDialog.data.city, detailDialog.data.district].filter(Boolean).join(' / ') || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="经度">{{ detailDialog.data.longitude ?? '-' }}</el-descriptions-item>
          <el-descriptions-item label="纬度">{{ detailDialog.data.latitude ?? '-' }}</el-descriptions-item>
          <el-descriptions-item label="项目描述" :span="2">{{ detailDialog.data.description || '-' }}</el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, nextTick, onActivated, onDeactivated, onMounted, onUnmounted, reactive, ref } from 'vue'
import { Location, RefreshRight } from '@element-plus/icons-vue'
import { appConfig } from '../../config/app-config'
import { fetchProjectMapListByFilters, fetchProjectMapSummaryByFilters, getProjectDetail } from '../../api/project'
import {
  MAP_RESOURCE_MANIFEST_FILE,
  MAP_RESOURCE_FILES,
  ROOT_PROVINCE_NAME,
  filterCountyGeoJsonByCity,
  findFeatureByName,
  getFeatureAdcode,
  getFeatureCenter,
  getFeatureName,
  resolveManifestMapResource,
  resolveMapResourceCacheKey,
  resolveProjectPoint
} from '../../utils/map-drilldown'
import { showError } from '../../utils/feedback'
import { logger } from '../../utils/logger'
import { nowMs, reportPerfAction, reportPerfDuration, resolveDurationMs } from '../../utils/perf-metrics'

const ROOT_MAP_KEY = 'dashboard-province-map'
const MAP_CLICK_EVENT = 'click'
const DEFAULT_POINT = [108.95, 34.27]
const COUNTY_GROUP_WARMUP_LIMIT = 3
const DISTRICT_FILE_WARMUP_LIMIT = 4

const mapContainerRef = ref(null)
const initializing = ref(false)
const switchingLevel = ref(false)
const refreshing = ref(false)
const mapErrorMessage = ref('')
const viewLevel = ref('province')
const selectedCity = ref('')
const selectedDistrict = ref('')
const provinceSummaryRows = ref([])
const districtSummaryRows = ref([])
const countyProjectRows = ref([])

const detailDialog = reactive({
  visible: false,
  loading: false,
  data: {}
})
const detailDialogRequestSeq = ref(0)

let chart = null
let echartsModulesPromise = null
let resizeTimer = null
let resizeListenerBound = false
const geoJsonCache = new Map()
const geoJsonPromiseCache = new Map()
const missingResourceCache = new Set()
const summaryCache = new Map()
const projectCache = new Map()
const registeredMapKeys = new Set()
let mapResourceManifest = undefined
let mapResourceManifestPromise = null
const echartsRuntime = {
  init: null,
  registerMap: null
}

function resolveFilteredCountyGeoJsonCacheKey(cityAdcode) {
  return `county-filtered|${String(cityAdcode || '').trim()}`
}

function resolvePerfThresholdMs(multiplier = 1) {
  return Math.max(200, Math.round(Number(appConfig.slowRequestThreshold || 800) * Number(multiplier || 1)))
}

function isHtmlDocumentText(text) {
  const normalizedText = String(text || '').trim().toLowerCase()
  return normalizedText.startsWith('<!doctype html') || normalizedText.startsWith('<html')
}

async function readResponseText(response) {
  if (typeof response?.text === 'function') {
    return response.text()
  }
  if (typeof response?.json === 'function') {
    return JSON.stringify(await response.json())
  }
  return ''
}

async function parseJsonPayload(response, options = {}) {
  const {
    resource = '',
    requiredResource = false,
    payloadLabel = '资源'
  } = options
  const contentType = response?.headers?.get?.('content-type')?.toLowerCase?.() || ''
  const text = await readResponseText(response)
  const normalizedText = String(text || '').trim()

  if (!normalizedText) {
    if (requiredResource) {
      throw new Error(`${payloadLabel}内容为空：${resource}`)
    }
    return null
  }

  // 如果返回的是 HTML，通常说明当前环境缺少对应的静态 JSON 资源。
  if (contentType.includes('text/html') || isHtmlDocumentText(normalizedText)) {
    if (requiredResource) {
      throw new Error(`${payloadLabel}加载失败，返回了异常页面：${resource}`)
    }
    return null
  }

  try {
    return JSON.parse(normalizedText)
  } catch (error) {
    if (requiredResource) {
      throw new Error(`${payloadLabel}解析失败：${resource}`)
    }
    return null
  }
}

function normalizeProjectRow(row) {
  return {
    ...row,
    projectName: String(row?.projectName || '').trim(),
    address: String(row?.address || '').trim(),
    province: String(row?.province || '').trim(),
    city: String(row?.city || '').trim(),
    district: String(row?.district || '').trim()
  }
}

function normalizeSummaryRow(row) {
  return {
    regionLevel: String(row?.regionLevel || '').trim(),
    regionName: String(row?.regionName || '').trim(),
    projectCount: Number(row?.projectCount || 0)
  }
}

function buildCacheKey(prefix, filters = {}) {
  return [
    prefix,
    String(filters.level || '').trim(),
    String(filters.province || '').trim(),
    String(filters.city || '').trim(),
    String(filters.district || '').trim()
  ].join('|')
}

function createCountMapFromSummaryRows(rows = []) {
  return new Map(rows.map((item) => [item.regionName, Number(item.projectCount || 0)]))
}

function sumProjectCount(rows = []) {
  return rows.reduce((total, item) => total + Number(item.projectCount || 0), 0)
}

const countyProjectRowsSorted = computed(() => (
  countyProjectRows.value
    .slice()
    .sort((a, b) => String(a.projectName || '').localeCompare(String(b.projectName || ''), 'zh-CN'))
))
const pageBusy = computed(() => initializing.value || switchingLevel.value)
const levelLabel = computed(() => {
  if (viewLevel.value === 'province') return '省级总览'
  if (viewLevel.value === 'city') return `${selectedCity.value || '-'} 市级下钻`
  return `${selectedDistrict.value || '-'} 县级项目`
})
const provinceProjectCount = computed(() => sumProjectCount(provinceSummaryRows.value))
const currentProjectCount = computed(() => (
  viewLevel.value === 'county'
    ? countyProjectRows.value.length
    : sumProjectCount(viewLevel.value === 'province' ? provinceSummaryRows.value : districtSummaryRows.value)
))
const missingCoordinateCount = computed(() => (
  countyProjectRows.value.filter((item) => {
    const lng = Number(item.longitude)
    const lat = Number(item.latitude)
    return !Number.isFinite(lng) || !Number.isFinite(lat) || lng === 0 || lat === 0
  }).length
))
const panelTitle = computed(() => {
  if (viewLevel.value === 'province') return '市级分布'
  if (viewLevel.value === 'city') return `${selectedCity.value} 区县分布`
  return `${selectedDistrict.value} 项目清单`
})
const panelSubtitle = computed(() => {
  if (viewLevel.value === 'province') return '点击右侧城市或地图区域，继续下钻到区县层'
  if (viewLevel.value === 'city') return '区县支持从右侧列表和地图区域双向联动'
  return '点击项目可查看详情。缺失坐标的项目会回退到区县中心点展示。'
})
const panelRows = computed(() => {
  if (viewLevel.value === 'county') {
    return countyProjectRowsSorted.value.map((item) => ({
      key: `project-${item.id}`,
      type: 'project',
      active: false,
      title: item.projectName || '未命名项目',
      subtitle: item.address || '暂无项目地址',
      count: item.district || '-',
      hint: '查看详情',
      projectId: item.id,
      project: item
    }))
  }

  const rows = viewLevel.value === 'province' ? provinceSummaryRows.value : districtSummaryRows.value
  return rows.map((item) => ({
    key: `${item.regionLevel}-${item.regionName}`,
    type: 'summary',
    active: viewLevel.value === 'city' && item.regionName === selectedDistrict.value,
    title: item.regionName,
    subtitle: `审批通过项目：${item.projectCount}`,
    count: item.projectCount,
    hint: viewLevel.value === 'province' ? '下钻到区县' : '查看项目',
    regionName: item.regionName
  }))
})
const panelEmptyText = computed(() => (
  viewLevel.value === 'county'
    ? '当前区县暂无审批通过项目'
    : '当前层级暂无区域汇总数据'
))
const secondaryStatValue = computed(() => {
  if (viewLevel.value === 'county') return missingCoordinateCount.value
  return panelRows.value[0]?.count || 0
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
        charts.MapChart,
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

async function loadMapResourceManifest() {
  if (mapResourceManifest !== undefined) return mapResourceManifest
  if (!mapResourceManifestPromise) {
    mapResourceManifestPromise = fetch(MAP_RESOURCE_MANIFEST_FILE)
      .then(async (response) => {
        if (!response.ok) {
          mapResourceManifest = null
          return mapResourceManifest
        }
        mapResourceManifest = await parseJsonPayload(response, {
          resource: MAP_RESOURCE_MANIFEST_FILE,
          requiredResource: false,
          payloadLabel: '地图资源清单'
        })
        return mapResourceManifest
      })
      .catch(() => {
        mapResourceManifest = null
        return mapResourceManifest
      })
      .finally(() => {
        mapResourceManifestPromise = null
      })
  }
  return mapResourceManifestPromise
}

async function tryLoadGeoJsonByResource(cacheKey, resource, requiredResource) {
  if (!resource) return null
  if (missingResourceCache.has(resource)) return null

  const response = await fetch(resource)
  if (!response.ok) {
    if (requiredResource) {
      throw new Error(`地图资源加载失败：${resource}`)
    }
    missingResourceCache.add(resource)
    return null
  }

  const geoJson = await parseJsonPayload(response, {
    resource,
    requiredResource,
    payloadLabel: '地图资源'
  })
  if (!geoJson || !Array.isArray(geoJson.features)) {
    if (requiredResource) {
      throw new Error(`地图资源格式不正确：${resource}`)
    }
    missingResourceCache.add(resource)
    return null
  }

  geoJsonCache.set(cacheKey, geoJson)
  return geoJson
}

async function loadMapGeoJson(level, scope = {}) {
  const cacheKey = resolveMapResourceCacheKey(level, scope)
  if (geoJsonCache.has(cacheKey)) return geoJsonCache.get(cacheKey)
  if (geoJsonPromiseCache.has(cacheKey)) return geoJsonPromiseCache.get(cacheKey)

  const fetchPromise = (async () => {
    const manifest = await loadMapResourceManifest()
    const manifestCandidates = resolveManifestMapResource(level, scope, manifest)
    // 保留通用的省、市、区县资源，作为清单资源缺失时的兜底候选。
    const fallbackCandidates = MAP_RESOURCE_FILES[level] ? [MAP_RESOURCE_FILES[level]] : []
    const candidates = manifestCandidates.length > 0
      ? [...manifestCandidates, ...fallbackCandidates]
      : fallbackCandidates

    if (candidates.length === 0) {
      throw new Error(`${level} 层级缺少可用地图资源`)
    }

    for (let index = 0; index < candidates.length; index += 1) {
      const resource = candidates[index]
      const isLastCandidate = index === candidates.length - 1
      const geoJson = await tryLoadGeoJsonByResource(cacheKey, resource, isLastCandidate)
      if (geoJson) {
        return geoJson
      }
    }

    throw new Error(`${level} 层级未找到可用地图资源`)
  })()
    .finally(() => {
      geoJsonPromiseCache.delete(cacheKey)
    })

  geoJsonPromiseCache.set(cacheKey, fetchPromise)
  return fetchPromise
}

async function ensureMapRegistered(mapKey, geoJson) {
  const runtime = await ensureEchartsReady()
  if (!registeredMapKeys.has(mapKey)) {
    runtime.registerMap(mapKey, geoJson)
    registeredMapKeys.add(mapKey)
  }
}

async function fetchMapSummary(level, filters = {}, force = false) {
  const cacheKey = buildCacheKey('summary', { ...filters, level })
  if (!force && summaryCache.has(cacheKey)) return summaryCache.get(cacheKey)

  const startAt = nowMs()
  const response = await fetchProjectMapSummaryByFilters(level, filters)
  const rows = Array.isArray(response?.data) ? response.data.map(normalizeSummaryRow) : []
  summaryCache.set(cacheKey, rows)

  const durationMs = Math.round(nowMs() - startAt)
  reportPerfAction('dashboard_fetch_map_summary', {
    durationMs,
    level,
    force,
    count: rows.length,
    ...filters
  }, {
    thresholdMs: resolvePerfThresholdMs(1),
    normalLevel: 'info'
  })
  if (durationMs >= appConfig.slowRequestThreshold) {
    logger.warn('地图汇总接口耗时偏高', { durationMs, level, count: rows.length, ...filters })
  } else {
    logger.debug('地图汇总接口完成', { durationMs, level, count: rows.length, ...filters })
  }
  return rows
}

async function fetchMapProjects(filters = {}, force = false) {
  const cacheKey = buildCacheKey('project', filters)
  if (!force && projectCache.has(cacheKey)) return projectCache.get(cacheKey)

  const startAt = nowMs()
  const response = await fetchProjectMapListByFilters(filters)
  const rows = Array.isArray(response?.data) ? response.data.map(normalizeProjectRow) : []
  projectCache.set(cacheKey, rows)

  const durationMs = Math.round(nowMs() - startAt)
  reportPerfAction('dashboard_fetch_map_points', {
    durationMs,
    force,
    count: rows.length,
    ...filters
  }, {
    thresholdMs: resolvePerfThresholdMs(1),
    normalLevel: 'info'
  })
  if (durationMs >= appConfig.slowRequestThreshold) {
    logger.warn('地图点位接口耗时偏高', { durationMs, count: rows.length, ...filters })
  } else {
    logger.debug('地图点位接口完成', { durationMs, count: rows.length, ...filters })
  }
  return rows
}

async function hydrateCurrentView(force = false) {
  const provinceFilters = { province: ROOT_PROVINCE_NAME }
  if (viewLevel.value === 'province') {
    provinceSummaryRows.value = await fetchMapSummary('city', provinceFilters, force)
    districtSummaryRows.value = []
    countyProjectRows.value = []
    return
  }

  const cityFilters = { province: ROOT_PROVINCE_NAME, city: selectedCity.value }
  districtSummaryRows.value = await fetchMapSummary('district', cityFilters, force)

  if (viewLevel.value === 'city') {
    countyProjectRows.value = []
    return
  }

  countyProjectRows.value = await fetchMapProjects({ ...cityFilters, district: selectedDistrict.value }, force)
}

function requestIdleTask(task) {
  if (typeof window === 'undefined') return
  const runner = () => {
    Promise.resolve()
      .then(task)
      .catch((error) => {
        logger.debug('地图资源预热已跳过', { message: error?.message })
      })
  }
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(() => runner(), { timeout: 800 })
    return
  }
  window.setTimeout(runner, 180)
}

async function resolveSelectedCityScope() {
  if (!selectedCity.value) {
    return {
      provinceName: ROOT_PROVINCE_NAME,
      cityName: ''
    }
  }
  return resolveCityScopeByName(selectedCity.value)
}

async function resolveCityScopeByName(cityName, cityGeoJson = null) {
  const normalizedCityName = String(cityName || '').trim()
  if (!normalizedCityName) return null

  const currentCityGeoJson = cityGeoJson || await loadMapGeoJson('city', { provinceName: ROOT_PROVINCE_NAME })
  const cityFeature = findFeatureByName(currentCityGeoJson, normalizedCityName)

  return {
    provinceName: ROOT_PROVINCE_NAME,
    cityName: normalizedCityName,
    cityAdcode: getFeatureAdcode(cityFeature)
  }
}

async function resolveDistrictScopeByName(districtName, cityScope = null, countyGeoJson = null) {
  const normalizedDistrictName = String(districtName || '').trim()
  if (!normalizedDistrictName) return null

  const resolvedCityScope = cityScope || await resolveSelectedCityScope()
  if (!resolvedCityScope) return null

  const currentCountyGeoJson = countyGeoJson || await loadMapGeoJson('county', resolvedCityScope)
  const districtFeature = findFeatureByName(currentCountyGeoJson, normalizedDistrictName)

  return {
    ...resolvedCityScope,
    districtName: normalizedDistrictName,
    districtAdcode: getFeatureAdcode(districtFeature)
  }
}

async function warmupTopCountyGroupResources(limit = COUNTY_GROUP_WARMUP_LIMIT) {
  if (viewLevel.value !== 'province' || provinceSummaryRows.value.length === 0) return

  const cityGeoJson = await loadMapGeoJson('city', { provinceName: ROOT_PROVINCE_NAME })
  const topCities = provinceSummaryRows.value
    .slice()
    .sort((a, b) => Number(b.projectCount || 0) - Number(a.projectCount || 0))
    .slice(0, limit)

  const tasks = topCities.map(async (item) => {
    const scope = await resolveCityScopeByName(item.regionName, cityGeoJson)
    if (!scope?.cityAdcode) return null
    return loadMapGeoJson('county', scope)
  })

  await Promise.all(tasks)
}

async function warmupTopDistrictResources(limit = DISTRICT_FILE_WARMUP_LIMIT) {
  if (viewLevel.value !== 'city' || districtSummaryRows.value.length === 0) return

  const cityScope = await resolveSelectedCityScope()
  if (!cityScope?.cityAdcode) return

  const countyGeoJson = await loadMapGeoJson('county', cityScope)
  const topDistricts = districtSummaryRows.value
    .slice()
    .sort((a, b) => Number(b.projectCount || 0) - Number(a.projectCount || 0))
    .slice(0, limit)

  const tasks = topDistricts.map(async (item) => {
    const scope = await resolveDistrictScopeByName(item.regionName, cityScope, countyGeoJson)
    if (!scope?.districtAdcode) return null
    return loadMapGeoJson('district', scope)
  })

  await Promise.all(tasks)
}

async function warmupCurrentLevelResources() {
  const tasks = []
  if (viewLevel.value === 'city') {
    const cityScope = await resolveSelectedCityScope()
    if (cityScope?.cityAdcode) {
      tasks.push(loadMapGeoJson('county', cityScope))
    }
  }
  if (viewLevel.value === 'county') {
    const cityScope = await resolveSelectedCityScope()
    if (cityScope?.cityAdcode) {
      const countyGeoJsonPromise = loadMapGeoJson('county', cityScope)
      tasks.push(countyGeoJsonPromise)
      tasks.push((async () => {
        const districtScope = await resolveDistrictScopeByName(selectedDistrict.value, cityScope, await countyGeoJsonPromise)
        if (districtScope?.districtAdcode) {
          return loadMapGeoJson('district', districtScope)
        }
        return null
      })())
    }
    tasks.push(loadMapGeoJson('province', { provinceName: ROOT_PROVINCE_NAME }))
  }
  if (tasks.length > 0) {
    await Promise.all(tasks)
  }
}

function warmupNextLevelResources() {
  requestIdleTask(async () => {
    if (viewLevel.value === 'province') {
      await Promise.all([
        loadMapGeoJson('province', { provinceName: ROOT_PROVINCE_NAME }),
        loadMapGeoJson('city', { provinceName: ROOT_PROVINCE_NAME })
      ])
      await warmupTopCountyGroupResources()
      return
    }
    if (viewLevel.value === 'city') {
      const countyScope = await resolveSelectedCityScope()
      await Promise.all([
        loadMapGeoJson('county', countyScope),
        loadMapGeoJson('province', { provinceName: ROOT_PROVINCE_NAME })
      ])
      await warmupTopDistrictResources()
    }
  })
}

async function getScopedCountyGeoJson(cityGeoJson, cityScope) {
  const countyGeoJson = await loadMapGeoJson('county', cityScope)
  const filteredCacheKey = resolveFilteredCountyGeoJsonCacheKey(cityScope?.cityAdcode)
  if (geoJsonCache.has(filteredCacheKey)) {
    return geoJsonCache.get(filteredCacheKey)
  }
  const scopedCountyGeoJson = filterCountyGeoJsonByCity(countyGeoJson, cityGeoJson, selectedCity.value)
  geoJsonCache.set(filteredCacheKey, scopedCountyGeoJson)
  return scopedCountyGeoJson
}

function buildRegionBubbleData(features, countMap, metaKey) {
  return features.map((feature) => {
    const name = getFeatureName(feature)
    const center = getFeatureCenter(feature)
    if (!center) return null
    return {
      name,
      value: [Number(center[0]), Number(center[1]), Number(countMap.get(name) || 0)],
      meta: { [metaKey]: name }
    }
  }).filter(Boolean)
}

function buildProvinceScene(cityGeoJson) {
  const countMap = createCountMapFromSummaryRows(provinceSummaryRows.value)
  const features = cityGeoJson.features || []
  return {
    mapKey: ROOT_MAP_KEY,
    geoJson: cityGeoJson,
    regionSeriesData: features.map((feature) => ({
      name: getFeatureName(feature),
      value: Number(countMap.get(getFeatureName(feature)) || 0)
    })),
    countBubbleData: buildRegionBubbleData(features, countMap, 'city'),
    projectScatterData: []
  }
}

function buildCityScene(cityGeoJson, scopedCountyGeoJson) {
  const features = scopedCountyGeoJson.features || []
  if (features.length === 0) {
    throw new Error(`${selectedCity.value || '当前城市'}缺少区县地图资源`)
  }

  const countMap = createCountMapFromSummaryRows(districtSummaryRows.value)
  const cityFeature = findFeatureByName(cityGeoJson, selectedCity.value)
  const cityAdcode = getFeatureAdcode(cityFeature) || selectedCity.value
  return {
    mapKey: `dashboard-city-${cityAdcode}`,
    geoJson: scopedCountyGeoJson,
    regionSeriesData: features.map((feature) => ({
      name: getFeatureName(feature),
      value: Number(countMap.get(getFeatureName(feature)) || 0)
    })),
    countBubbleData: buildRegionBubbleData(features, countMap, 'district'),
    projectScatterData: []
  }
}

function buildCountyScene(cityGeoJson, districtGeoJson, provinceGeoJson) {
  const features = districtGeoJson.features || []
  const districtFeature = features[0] || findFeatureByName(districtGeoJson, selectedDistrict.value)
  if (!districtFeature) {
    throw new Error(`${selectedDistrict.value || '当前区县'}缺少区县边界资源`)
  }

  const cityFeature = findFeatureByName(cityGeoJson, selectedCity.value)
  const provinceFeature = (provinceGeoJson.features || [])[0] || null
  const districtAdcode = getFeatureAdcode(districtFeature) || selectedDistrict.value

  return {
    mapKey: `dashboard-district-${districtAdcode}`,
    geoJson: {
      type: 'FeatureCollection',
      features: [districtFeature]
    },
    regionSeriesData: [{
      name: getFeatureName(districtFeature),
      value: countyProjectRows.value.length
    }],
    countBubbleData: [],
    projectScatterData: countyProjectRows.value.map((item) => {
      const point = resolveProjectPoint(item, [districtFeature, cityFeature, provinceFeature], DEFAULT_POINT)
      return {
        name: item.projectName,
        value: [Number(point[0]), Number(point[1]), item.id, item.address || '-'],
        meta: { projectId: item.id, projectSnapshot: item }
      }
    })
  }
}

function buildTooltipFormatter() {
  return (params) => {
    if (params.seriesName === '项目点位') {
      return `
        <div class="map-tooltip">
          <div class="map-tooltip__title">${params.name}</div>
          <div>项目地址：${params.value?.[3] || '-'}</div>
        </div>
      `
    }
    const count = params.data?.value ?? params.value ?? 0
    const hint = viewLevel.value === 'province'
      ? '点击进入市级下钻'
      : viewLevel.value === 'city'
        ? '点击进入区县项目'
        : '点击项目查看详情'
    return `
      <div class="map-tooltip">
        <div class="map-tooltip__title">${params.name}</div>
        <div>审批通过项目数：${count}</div>
        <div>${hint}</div>
      </div>
    `
  }
}

async function renderMap() {
  if (!chart) return

  const renderStartAt = nowMs()
  const cityGeoJson = await loadMapGeoJson('city', { provinceName: ROOT_PROVINCE_NAME })
  const cityFeature = selectedCity.value ? findFeatureByName(cityGeoJson, selectedCity.value) : null
  const cityAdcode = getFeatureAdcode(cityFeature)
  const cityScope = cityFeature
    ? { provinceName: ROOT_PROVINCE_NAME, cityName: selectedCity.value, cityAdcode }
    : { provinceName: ROOT_PROVINCE_NAME }
  const scene = viewLevel.value === 'province'
    ? buildProvinceScene(cityGeoJson)
    : viewLevel.value === 'city'
      ? buildCityScene(
          cityGeoJson,
          await getScopedCountyGeoJson(cityGeoJson, cityScope)
        )
      : await (async () => {
          const countyGeoJsonPromise = loadMapGeoJson('county', cityScope)
          const [provinceGeoJson, districtScope] = await Promise.all([
            loadMapGeoJson('province', { provinceName: ROOT_PROVINCE_NAME }),
            resolveDistrictScopeByName(selectedDistrict.value, cityScope, await countyGeoJsonPromise)
          ])
          const districtGeoJson = await loadMapGeoJson('district', districtScope)
          return buildCountyScene(cityGeoJson, districtGeoJson, provinceGeoJson)
        })()

  await ensureMapRegistered(scene.mapKey, scene.geoJson)

  const maxValue = Math.max(1, ...scene.regionSeriesData.map((item) => Number(item.value || 0)))
  const isProvinceLevel = viewLevel.value === 'province'
  const showProjectLabels = viewLevel.value === 'county' && scene.projectScatterData.length > 0 && scene.projectScatterData.length <= 10
  const showBubbleLabels = isProvinceLevel || scene.countBubbleData.length <= 18
  const shouldUseEffectScatter = scene.projectScatterData.length <= 60 && scene.countBubbleData.length <= 24
  const enableAnimation = shouldUseEffectScatter && scene.projectScatterData.length <= 80

  chart.setOption({
    animation: enableAnimation,
    animationDuration: enableAnimation ? 320 : 0,
    animationDurationUpdate: enableAnimation ? 220 : 0,
    visualMap: {
      min: 0,
      max: maxValue,
      show: false,
      inRange: { color: ['#e0f2fe', '#7dd3fc', '#0f766e'] }
    },
    tooltip: {
      trigger: 'item',
      confine: true,
      formatter: buildTooltipFormatter()
    },
    geo: {
      map: scene.mapKey,
      roam: true,
      zoom: isProvinceLevel ? 1.05 : 1.18,
      label: { show: false },
      itemStyle: {
        areaColor: '#f8fafc',
        borderColor: '#93c5fd',
        borderWidth: 1
      },
      emphasis: {
        itemStyle: { areaColor: '#bfdbfe' }
      }
    },
    series: [
      {
        name: '区域分布',
        type: 'map',
        geoIndex: 0,
        data: scene.regionSeriesData,
        selectedMode: false,
        label: {
          show: isProvinceLevel,
          color: '#0f172a',
          fontSize: 12,
          formatter: (params) => `${params.name}\n${params.data?.value || 0}`
        },
        emphasis: {
          label: { show: true, color: '#0f172a' }
        },
        itemStyle: { borderColor: '#93c5fd' }
      },
      {
        name: '区域项目数量',
        type: shouldUseEffectScatter ? 'effectScatter' : 'scatter',
        coordinateSystem: 'geo',
        data: scene.countBubbleData,
        symbolSize: (val) => Math.max(10, Math.min(24, 10 + Number(val[2] || 0) * 1.4)),
        showEffectOn: shouldUseEffectScatter ? 'render' : 'emphasis',
        rippleEffect: shouldUseEffectScatter
          ? {
              brushType: 'stroke',
              scale: 2.6
            }
          : undefined,
        itemStyle: {
          color: '#0f766e',
          shadowBlur: 10,
          shadowColor: 'rgba(15, 118, 110, 0.35)'
        },
        label: {
          show: showBubbleLabels,
          formatter: (params) => `${params.name}\n${params.value?.[2] || 0}`,
          position: 'right',
          color: '#0f172a',
          fontSize: 11,
          backgroundColor: 'rgba(255,255,255,0.92)',
          borderRadius: 8,
          padding: [3, 6]
        },
        zlevel: 3
      },
      {
        name: '项目点位',
        type: shouldUseEffectScatter ? 'effectScatter' : 'scatter',
        coordinateSystem: 'geo',
        data: scene.projectScatterData,
        symbolSize: 12,
        showEffectOn: shouldUseEffectScatter ? 'render' : 'emphasis',
        rippleEffect: shouldUseEffectScatter
          ? {
              brushType: 'stroke',
              scale: 3.2
            }
          : undefined,
        itemStyle: {
          color: '#ef4444',
          shadowBlur: 14,
          shadowColor: 'rgba(239, 68, 68, 0.35)'
        },
        label: {
          show: showProjectLabels,
          formatter: (params) => params.name,
          position: 'right',
          color: '#7f1d1d',
          fontSize: 11,
          backgroundColor: 'rgba(255,255,255,0.9)',
          borderRadius: 8,
          padding: [3, 6]
        },
        zlevel: 4
      }
    ]
  }, true)

  const durationMs = Math.round(nowMs() - renderStartAt)
  reportPerfAction('dashboard_render_map', {
    durationMs,
    level: viewLevel.value,
    regionCount: scene.regionSeriesData.length,
    projectCount: scene.projectScatterData.length
  }, {
    thresholdMs: resolvePerfThresholdMs(1),
    normalLevel: 'info'
  })
  if (durationMs >= appConfig.slowRequestThreshold) {
    logger.warn('首页地图渲染耗时偏高', {
      durationMs,
      level: viewLevel.value,
      regionCount: scene.regionSeriesData.length,
      projectCount: scene.projectScatterData.length
    })
  } else {
    logger.debug('首页地图渲染完成', {
      durationMs,
      level: viewLevel.value,
      regionCount: scene.regionSeriesData.length,
      projectCount: scene.projectScatterData.length
    })
  }
}

async function syncView(force = false, context = {}) {
  const syncStartAt = nowMs()
  mapErrorMessage.value = ''

  void warmupCurrentLevelResources().catch((error) => {
    logger.debug('当前层级资源预热已跳过', { message: error?.message || '' })
  })

  const hydrateStartAt = nowMs()
  await hydrateCurrentView(force)
  context.hydrateMs = resolveDurationMs(hydrateStartAt)

  const renderStartAt = nowMs()
  await renderMap()
  context.renderMs = resolveDurationMs(renderStartAt)
  context.prepareResourcesMs = 0
  context.durationMs = resolveDurationMs(syncStartAt)

  reportPerfAction('dashboard_sync_view', {
    force,
    level: viewLevel.value,
    trigger: context.trigger || 'system',
    hydrateMs: context.hydrateMs,
    prepareResourcesMs: context.prepareResourcesMs,
    renderMs: context.renderMs,
    durationMs: context.durationMs,
    warmupInBackground: true
  }, {
    thresholdMs: resolvePerfThresholdMs(1.4),
    normalLevel: 'info'
  })

  warmupNextLevelResources()
  return context
}

async function withBusyState(type, runner) {
  if (type === 'refresh') refreshing.value = true
  else if (type === 'init') initializing.value = true
  else switchingLevel.value = true

  try {
    await runner()
  } catch (error) {
    mapErrorMessage.value = error?.message || '地图加载失败，请稍后重试'
    showError(mapErrorMessage.value)
  } finally {
    if (type === 'refresh') refreshing.value = false
    else if (type === 'init') initializing.value = false
    else switchingLevel.value = false
  }
}

async function reloadCurrentView() {
  const refreshStartAt = nowMs()
  const syncMetrics = {}
  await withBusyState('refresh', async () => {
    await syncView(true, syncMetrics)
  })
  reportPerfDuration('dashboard_manual_refresh', refreshStartAt, {
    level: viewLevel.value,
    success: !mapErrorMessage.value,
    syncMs: syncMetrics.durationMs || 0
  }, {
    thresholdMs: resolvePerfThresholdMs(1.4),
    normalLevel: 'info'
  })
}

async function openProjectDetail(projectId, context = {}, fallbackData = null) {
  if (!projectId) return
  const requestSeq = ++detailDialogRequestSeq.value
  const detailStartAt = nowMs()
  detailDialog.visible = true
  detailDialog.loading = true
  detailDialog.data = fallbackData || detailDialog.data || {}
  try {
    const res = await getProjectDetail(projectId)
    if (requestSeq !== detailDialogRequestSeq.value || !detailDialog.visible) {
      return
    }
    detailDialog.data = res.data || fallbackData || {}
    reportPerfDuration('dashboard_project_detail_open', detailStartAt, {
      projectId,
      source: context.source || 'unknown',
      success: true
    }, {
      thresholdMs: resolvePerfThresholdMs(1),
      normalLevel: 'info'
    })
  } catch (error) {
    detailDialog.visible = false
    showError('加载项目详情失败')
    reportPerfDuration('dashboard_project_detail_open', detailStartAt, {
      projectId,
      source: context.source || 'unknown',
      success: false,
      errorMessage: error?.message || ''
    }, {
      thresholdMs: resolvePerfThresholdMs(1),
      normalLevel: 'info'
    })
  } finally {
    if (requestSeq === detailDialogRequestSeq.value) {
      detailDialog.loading = false
    }
  }
}

async function drillToCity(cityName, context = {}) {
  const drillStartAt = nowMs()
  selectedCity.value = cityName
  selectedDistrict.value = ''
  viewLevel.value = 'city'
  await withBusyState('switch', async () => {
    await syncView(false, {
      trigger: context.trigger || 'map'
    })
  })
  reportPerfDuration('dashboard_map_drilldown', drillStartAt, {
    fromLevel: 'province',
    toLevel: 'city',
    city: cityName,
    trigger: context.trigger || 'map',
    success: !mapErrorMessage.value
  }, {
    thresholdMs: resolvePerfThresholdMs(1.5),
    normalLevel: 'info'
  })
}

async function drillToCounty(districtName, context = {}) {
  const drillStartAt = nowMs()
  selectedDistrict.value = districtName
  viewLevel.value = 'county'
  await withBusyState('switch', async () => {
    await syncView(false, {
      trigger: context.trigger || 'map'
    })
  })
  reportPerfDuration('dashboard_map_drilldown', drillStartAt, {
    fromLevel: 'city',
    toLevel: 'county',
    city: selectedCity.value,
    district: districtName,
    trigger: context.trigger || 'map',
    success: !mapErrorMessage.value
  }, {
    thresholdMs: resolvePerfThresholdMs(1.5),
    normalLevel: 'info'
  })
}

async function resetToProvince() {
  if (viewLevel.value === 'province') return
  const switchStartAt = nowMs()
  viewLevel.value = 'province'
  selectedCity.value = ''
  selectedDistrict.value = ''
  await withBusyState('switch', async () => {
    await syncView(false, { trigger: 'breadcrumb' })
  })
  reportPerfDuration('dashboard_level_reset', switchStartAt, {
    toLevel: 'province',
    trigger: 'breadcrumb',
    success: !mapErrorMessage.value
  }, {
    thresholdMs: resolvePerfThresholdMs(1.4),
    normalLevel: 'info'
  })
}

async function backToCity() {
  if (!selectedCity.value || viewLevel.value === 'city') return
  const switchStartAt = nowMs()
  viewLevel.value = 'city'
  selectedDistrict.value = ''
  await withBusyState('switch', async () => {
    await syncView(false, { trigger: 'breadcrumb' })
  })
  reportPerfDuration('dashboard_level_back', switchStartAt, {
    toLevel: 'city',
    city: selectedCity.value,
    trigger: 'breadcrumb',
    success: !mapErrorMessage.value
  }, {
    thresholdMs: resolvePerfThresholdMs(1.4),
    normalLevel: 'info'
  })
}

async function goBack() {
  if (viewLevel.value === 'county') {
    await backToCity()
    return
  }
  await resetToProvince()
}

async function handlePanelItemClick(item) {
  if (item.type === 'project') {
    await openProjectDetail(item.projectId, { source: 'panel' }, item.project)
    return
  }
  if (viewLevel.value === 'province') {
    await drillToCity(item.regionName, { trigger: 'panel' })
    return
  }
  if (viewLevel.value === 'city') {
    await drillToCounty(item.regionName, { trigger: 'panel' })
  }
}

function handleResize() {
  if (resizeTimer) clearTimeout(resizeTimer)
  resizeTimer = window.setTimeout(() => {
    chart?.resize()
  }, 120)
}

function bindChartEvents() {
  if (!chart) return
  chart.off(MAP_CLICK_EVENT)
  chart.on(MAP_CLICK_EVENT, async (params) => {
    const projectId = params?.data?.meta?.projectId
    if (projectId) {
      await openProjectDetail(projectId, { source: 'map' }, params?.data?.meta?.projectSnapshot || null)
      return
    }

    const regionName = params?.data?.meta?.city || params?.data?.meta?.district || params?.name
    if (!regionName) return

    if (viewLevel.value === 'province') {
      await drillToCity(regionName, { trigger: 'map' })
      return
    }
    if (viewLevel.value === 'city') {
      await drillToCounty(regionName, { trigger: 'map' })
    }
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
  const setupStartAt = nowMs()
  await nextTick()
  await new Promise((resolve) => requestAnimationFrame(resolve))

  const container = mapContainerRef.value
  if (!container) {
    throw new Error('地图容器初始化失败')
  }

  const runtime = await ensureEchartsReady()
  if (!chart) {
    chart = runtime.init(container, null, { renderer: 'canvas', useDirtyRect: true })
    bindChartEvents()
  }

  await hydrateCurrentView(false)
  requestIdleTask(() => warmupCurrentLevelResources())
  await renderMap()
  warmupNextLevelResources()
  reportPerfDuration('dashboard_chart_setup', setupStartAt, {
    level: viewLevel.value,
    success: true
  }, {
    thresholdMs: resolvePerfThresholdMs(1.6),
    normalLevel: 'info'
  })
}

onMounted(async () => {
  await withBusyState('init', async () => {
    await setupChart()
    ensureResizeListener(true)
  })
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
  if (resizeTimer) clearTimeout(resizeTimer)
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
  gap: 16px;
  align-items: flex-start;
}

.header-main {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.header-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.title {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
}

.breadcrumb {
  flex-wrap: wrap;
}

.crumb-button {
  padding: 0;
  border: none;
  background: transparent;
  color: #2563eb;
  cursor: pointer;
  font: inherit;
}

.crumb-button[disabled] {
  color: #64748b;
  cursor: default;
}

.summary-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.header-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.content-shell {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  height: 100%;
}

.chart-section {
  min-width: 0;
  border-right: 1px solid #e2e8f0;
}

.chart-shell {
  position: relative;
  width: 100%;
  height: 100%;
}

.chart-div {
  width: 100%;
  height: calc(100vh - 144px);
  min-height: 520px;
}

.overlay-card {
  position: absolute;
  left: 24px;
  bottom: 24px;
  max-width: 360px;
  padding: 16px 18px;
  border-radius: 16px;
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.12);
  backdrop-filter: blur(10px);
  z-index: 5;
}

.overlay-card--empty {
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(148, 163, 184, 0.28);
}

.overlay-card--error {
  background: rgba(254, 242, 242, 0.96);
  border: 1px solid rgba(248, 113, 113, 0.28);
}

.overlay-title {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
}

.overlay-text {
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.6;
  color: #475569;
}

.insight-panel {
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
}

.panel-header {
  padding: 20px 20px 12px;
}

.panel-title {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
}

.panel-subtitle {
  margin-top: 6px;
  color: #475569;
  font-size: 13px;
  line-height: 1.6;
}

.panel-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  padding: 0 20px 16px;
}

.stat-card {
  padding: 12px;
  border-radius: 14px;
  background: #fff;
  border: 1px solid #e2e8f0;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.05);
}

.stat-label {
  display: block;
  font-size: 12px;
  color: #64748b;
}

.stat-value {
  display: block;
  margin-top: 8px;
  font-size: 18px;
  color: #0f172a;
}

.panel-list {
  flex: 1;
  overflow: auto;
  padding: 0 12px 12px;
}

.panel-empty {
  padding: 24px 16px;
  color: #64748b;
  font-size: 13px;
  line-height: 1.6;
}

.panel-item {
  width: 100%;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 12px;
  border: 1px solid transparent;
  border-radius: 14px;
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: background-color 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
}

.panel-item + .panel-item {
  margin-top: 8px;
}

.panel-item:hover,
.panel-item--active {
  background: #eff6ff;
  border-color: #bfdbfe;
  transform: translateY(-1px);
}

.panel-item__main {
  min-width: 0;
}

.panel-item__title {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
  word-break: break-word;
}

.panel-item__subtitle {
  margin-top: 6px;
  font-size: 12px;
  color: #64748b;
  line-height: 1.5;
  word-break: break-word;
}

.panel-item__side {
  text-align: right;
  flex-shrink: 0;
}

.panel-item__count {
  display: block;
  font-size: 16px;
  color: #0f766e;
}

.panel-item__hint {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  color: #64748b;
}

:deep(.el-card__body) {
  padding: 0 !important;
  flex: 1;
  overflow: hidden;
}

:deep(.map-tooltip__title) {
  margin-bottom: 6px;
  font-weight: 700;
  color: #0f172a;
}

@media (max-width: 1200px) {
  .content-shell {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(420px, 1fr) auto;
  }

  .chart-section {
    border-right: none;
    border-bottom: 1px solid #e2e8f0;
  }

  .chart-div {
    height: calc(100vh - 220px);
    min-height: 420px;
  }
}

@media (max-width: 960px) {
  .map-header {
    flex-direction: column;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-start;
    flex-wrap: wrap;
  }

  .panel-stats {
    grid-template-columns: 1fr;
  }

  .overlay-card {
    left: 12px;
    right: 12px;
    bottom: 12px;
    max-width: none;
  }
}
</style>
