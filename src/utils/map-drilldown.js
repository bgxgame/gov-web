export const ROOT_PROVINCE_NAME = '陕西省'
export const MAP_RESOURCE_MANIFEST_FILE = '/map-data/resource-manifest.json'
export const MAP_RESOURCE_FILES = {
  province: '/map-data/province.geojson',
  city: '/map-data/city.geojson',
  county: '/map-data/county.geojson'
}

const REGION_SUFFIX_PATTERN = /(特别行政区|自治州|自治区|地区|盟|省|市|区|县|旗)$/u
const FILE_NAME_SANITIZE_PATTERN = /[\\/:*?"<>|]/g

function toNumericCoordinate(value) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

function walkCoordinates(coordinates, handler) {
  if (!Array.isArray(coordinates)) return
  if (typeof coordinates[0] === 'number') {
    handler(coordinates)
    return
  }
  coordinates.forEach((item) => walkCoordinates(item, handler))
}

function normalizeFilenamePart(value) {
  return String(value || '')
    .trim()
    .replace(FILE_NAME_SANITIZE_PATTERN, '')
    .replace(/\s+/g, '')
}

function createMapResourcePath(fileName) {
  const normalizedName = normalizeFilenamePart(fileName)
  return normalizedName ? `/map-data/${normalizedName}` : ''
}

function dedupeTruthy(list = []) {
  return [...new Set(list.map((item) => String(item || '').trim()).filter(Boolean))]
}

function normalizeManifestEntry(entry) {
  if (!entry) return []
  if (Array.isArray(entry)) return dedupeTruthy(entry)
  return dedupeTruthy([entry])
}

export function normalizeRegionName(name) {
  const text = String(name || '').trim()
  if (!text) return ''
  return text.replace(REGION_SUFFIX_PATTERN, '')
}

export function extractRegionAdcode(rawCode) {
  const digits = String(rawCode || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.length >= 6) return digits.slice(-6)
  return digits
}

export function getFeatureName(feature) {
  return String(feature?.properties?.name || '').trim()
}

export function getFeatureAdcode(feature) {
  return extractRegionAdcode(feature?.properties?.gb || feature?.properties?.adcode)
}

export function buildFeatureCollection(features = []) {
  return {
    type: 'FeatureCollection',
    features
  }
}

export function findFeatureByName(geoJson, regionName) {
  const targetName = String(regionName || '').trim()
  if (!targetName) return null
  const normalizedTarget = normalizeRegionName(targetName)
  return (
    geoJson?.features?.find((feature) => {
      const featureName = getFeatureName(feature)
      return featureName === targetName || normalizeRegionName(featureName) === normalizedTarget
    }) || null
  )
}

export function filterCountyGeoJsonByCity(countyGeoJson, cityGeoJson, cityName) {
  const cityFeature = findFeatureByName(cityGeoJson, cityName)
  const cityAdcode = getFeatureAdcode(cityFeature)
  if (!cityAdcode) return buildFeatureCollection([])
  const cityPrefix = cityAdcode.slice(0, 4)
  const features = (countyGeoJson?.features || []).filter((feature) => getFeatureAdcode(feature).startsWith(cityPrefix))
  return buildFeatureCollection(features)
}

export function getFeatureCenter(feature) {
  const cp = feature?.properties?.cp
  if (Array.isArray(cp) && cp.length >= 2) {
    const lng = toNumericCoordinate(cp[0])
    const lat = toNumericCoordinate(cp[1])
    if (lng !== null && lat !== null) return [lng, lat]
  }

  let minLng = Infinity
  let minLat = Infinity
  let maxLng = -Infinity
  let maxLat = -Infinity

  walkCoordinates(feature?.geometry?.coordinates, (point) => {
    const lng = toNumericCoordinate(point[0])
    const lat = toNumericCoordinate(point[1])
    if (lng === null || lat === null) return
    minLng = Math.min(minLng, lng)
    minLat = Math.min(minLat, lat)
    maxLng = Math.max(maxLng, lng)
    maxLat = Math.max(maxLat, lat)
  })

  if (!Number.isFinite(minLng) || !Number.isFinite(minLat) || !Number.isFinite(maxLng) || !Number.isFinite(maxLat)) {
    return null
  }

  return [Number(((minLng + maxLng) / 2).toFixed(6)), Number(((minLat + maxLat) / 2).toFixed(6))]
}

export function buildRegionCountMap(rows = [], field) {
  const countMap = new Map()
  rows.forEach((item) => {
    const rawName = String(item?.[field] || '').trim()
    if (!rawName) return
    const normalizedName = normalizeRegionName(rawName)
    countMap.set(rawName, (countMap.get(rawName) || 0) + 1)
    if (normalizedName && normalizedName !== rawName) {
      countMap.set(normalizedName, (countMap.get(normalizedName) || 0) + 1)
    }
  })
  return countMap
}

export function getRegionCount(countMap, regionName) {
  if (!(countMap instanceof Map)) return 0
  const rawName = String(regionName || '').trim()
  if (!rawName) return 0
  return countMap.get(rawName) || countMap.get(normalizeRegionName(rawName)) || 0
}

export function resolveProjectPoint(project, fallbackFeatures = [], defaultPoint = [108.95, 34.27]) {
  const lng = toNumericCoordinate(project?.longitude)
  const lat = toNumericCoordinate(project?.latitude)
  if (lng !== null && lat !== null && lng !== 0 && lat !== 0) {
    return [lng, lat]
  }

  for (const feature of fallbackFeatures) {
    const center = getFeatureCenter(feature)
    if (center) return center
  }

  return defaultPoint
}

export function resolveMapResourceCacheKey(level, scope = {}) {
  return [
    String(level || '').trim(),
    String(scope.provinceName || '').trim(),
    String(scope.provinceAdcode || '').trim(),
    String(scope.cityName || '').trim(),
    String(scope.cityAdcode || '').trim(),
    String(scope.districtName || '').trim(),
    String(scope.districtAdcode || '').trim()
  ].join('|')
}

export function resolveMapResourceCandidates(level, scope = {}) {
  const normalizedLevel = String(level || '').trim()
  const provinceName = normalizeFilenamePart(scope.provinceName)
  const provinceShortName = normalizeFilenamePart(normalizeRegionName(scope.provinceName))
  const provinceAdcode = normalizeFilenamePart(scope.provinceAdcode)
  const cityName = normalizeFilenamePart(scope.cityName)
  const cityShortName = normalizeFilenamePart(normalizeRegionName(scope.cityName))
  const cityAdcode = normalizeFilenamePart(scope.cityAdcode)

  if (normalizedLevel === 'province') {
    return dedupeTruthy([
      createMapResourcePath(`${provinceAdcode}.geojson`),
      createMapResourcePath(`${provinceAdcode}.json`),
      createMapResourcePath(`${provinceName}_省.geojson`),
      createMapResourcePath(`${provinceName}_省.json`),
      createMapResourcePath(`${provinceName}.geojson`),
      createMapResourcePath(`${provinceShortName}.geojson`),
      MAP_RESOURCE_FILES.province
    ])
  }

  if (normalizedLevel === 'city') {
    return dedupeTruthy([
      createMapResourcePath(`${provinceAdcode}_市.geojson`),
      createMapResourcePath(`${provinceAdcode}_市.json`),
      createMapResourcePath(`${provinceAdcode}.geojson`),
      createMapResourcePath(`${provinceAdcode}.json`),
      createMapResourcePath(`${provinceName}_市.geojson`),
      createMapResourcePath(`${provinceName}_市.json`),
      createMapResourcePath(`${provinceName}.geojson`),
      createMapResourcePath(`${provinceShortName}_市.geojson`),
      MAP_RESOURCE_FILES.city
    ])
  }

  if (normalizedLevel === 'county') {
    return dedupeTruthy([
      createMapResourcePath(`${cityAdcode}.geojson`),
      createMapResourcePath(`${cityAdcode}.json`),
      createMapResourcePath(`${cityName}_县.geojson`),
      createMapResourcePath(`${cityName}_县.json`),
      createMapResourcePath(`${cityName}_区县.geojson`),
      createMapResourcePath(`${cityName}_区县.json`),
      createMapResourcePath(`${cityName}.geojson`),
      createMapResourcePath(`${cityName}.json`),
      createMapResourcePath(`${cityShortName}_县.geojson`),
      createMapResourcePath(`${cityShortName}.geojson`),
      MAP_RESOURCE_FILES.county
    ])
  }

  return normalizeManifestEntry(MAP_RESOURCE_FILES[normalizedLevel])
}

export function resolveManifestMapResource(level, scope = {}, manifest = null) {
  if (!manifest || typeof manifest !== 'object') return []
  const levelEntry = manifest?.[level]
  if (!levelEntry) return []
  if (typeof levelEntry === 'string' || Array.isArray(levelEntry)) {
    return normalizeManifestEntry(levelEntry)
  }

  const lookupKeys = dedupeTruthy([
    scope.districtAdcode,
    scope.districtName,
    normalizeRegionName(scope.districtName),
    scope.cityAdcode,
    scope.cityName,
    normalizeRegionName(scope.cityName),
    scope.provinceAdcode,
    scope.provinceName,
    normalizeRegionName(scope.provinceName),
    'default'
  ])

  for (const key of lookupKeys) {
    const value = levelEntry?.[key]
    if (value) return normalizeManifestEntry(value)
  }

  return []
}
