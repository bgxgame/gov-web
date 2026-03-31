import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const fetchProjectMapSummaryByFilters = vi.fn()
const fetchProjectMapListByFilters = vi.fn()
const getProjectDetail = vi.fn()
const showError = vi.fn()
const logUserAction = vi.fn()
const logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
}

const chartHandlers = {}
const setOption = vi.fn()
const resize = vi.fn()
const dispose = vi.fn()
const off = vi.fn((eventName) => {
  delete chartHandlers[eventName]
})
const on = vi.fn((eventName, handler) => {
  chartHandlers[eventName] = handler
})
const init = vi.fn(() => ({
  setOption,
  resize,
  dispose,
  off,
  on
}))
const registerMap = vi.fn()
const use = vi.fn()

vi.mock('../../src/api/project', () => ({
  fetchProjectMapSummaryByFilters,
  fetchProjectMapListByFilters,
  getProjectDetail
}))

vi.mock('../../src/utils/feedback', () => ({
  showError
}))

vi.mock('../../src/utils/logger', () => ({
  logger,
  logUserAction
}))

vi.mock('echarts/core', () => ({
  use,
  init,
  registerMap
}))

vi.mock('echarts/components', () => ({
  GeoComponent: {},
  TooltipComponent: {},
  VisualMapComponent: {}
}))

vi.mock('echarts/charts', () => ({
  MapChart: {},
  EffectScatterChart: {}
}))

vi.mock('echarts/renderers', () => ({
  CanvasRenderer: {}
}))

function createSquareFeature(name, gb, startLng, startLat) {
  return {
    type: 'Feature',
    properties: { name, gb },
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [startLng, startLat],
        [startLng + 1, startLat],
        [startLng + 1, startLat + 1],
        [startLng, startLat + 1],
        [startLng, startLat]
      ]]
    }
  }
}

const provinceGeoJson = {
  type: 'FeatureCollection',
  features: [createSquareFeature('陕西省', '156610000', 107, 32)]
}

const cityGeoJson = {
  type: 'FeatureCollection',
  features: [
    createSquareFeature('西安市', '156610100', 108, 34),
    createSquareFeature('安康市', '156610900', 109, 32)
  ]
}

const countyGeoJson = {
  type: 'FeatureCollection',
  features: [
    createSquareFeature('雁塔区', '156610113', 108.8, 34.1),
    createSquareFeature('长安区', '156610116', 108.9, 34.2)
  ]
}

const globalStubs = {
  ElCard: { template: '<div><slot name="header" /><slot /></div>' },
  ElIcon: { template: '<i><slot /></i>' },
  ElTag: { template: '<span><slot /></span>' },
  ElBreadcrumb: { template: '<nav><slot /></nav>' },
  ElBreadcrumbItem: { template: '<span><slot /></span>' },
  ElButton: {
    props: ['icon', 'loading'],
    emits: ['click'],
    template: '<button @click="$emit(\'click\')"><slot /></button>'
  },
  ElDialog: { props: ['modelValue'], emits: ['update:modelValue'], template: '<div><slot /><slot name="footer" /></div>' },
  ElDescriptions: { template: '<div><slot /></div>' },
  ElDescriptionsItem: { template: '<div><slot /></div>' }
}

async function flushAll() {
  await vi.dynamicImportSettled()
  await new Promise((resolve) => setTimeout(resolve, 0))
  await Promise.resolve()
  await Promise.resolve()
}

function createJsonResponse(payload) {
  const text = JSON.stringify(payload)
  return {
    ok: true,
    status: 200,
    headers: {
      get: (name) => (String(name || '').toLowerCase() === 'content-type' ? 'application/json' : '')
    },
    json: async () => payload,
    text: async () => text
  }
}

function createHtmlResponse() {
  const text = '<!doctype html><html><body>fallback</body></html>'
  return {
    ok: true,
    status: 200,
    headers: {
      get: (name) => (String(name || '').toLowerCase() === 'content-type' ? 'text/html; charset=utf-8' : '')
    },
    text: async () => text
  }
}

describe('dashboard view', () => {
  beforeEach(() => {
    fetchProjectMapSummaryByFilters.mockReset()
    fetchProjectMapListByFilters.mockReset()
    getProjectDetail.mockReset()
    showError.mockReset()
    logger.debug.mockReset()
    logger.warn.mockReset()
    logger.error.mockReset()
    use.mockReset()
    init.mockClear()
    registerMap.mockClear()
    setOption.mockClear()
    resize.mockClear()
    dispose.mockClear()
    off.mockClear()
    on.mockClear()
    Object.keys(chartHandlers).forEach((key) => delete chartHandlers[key])

    fetchProjectMapSummaryByFilters.mockImplementation(async (level, filters) => {
      if (level === 'city') {
        return {
          data: [
            { regionLevel: 'city', regionName: '西安市', projectCount: 2 },
            { regionLevel: 'city', regionName: '安康市', projectCount: 1 }
          ]
        }
      }
      if (level === 'district' && filters.city === '西安市') {
        return {
          data: [
            { regionLevel: 'district', regionName: '雁塔区', projectCount: 1 },
            { regionLevel: 'district', regionName: '长安区', projectCount: 1 }
          ]
        }
      }
      return { data: [] }
    })

    fetchProjectMapListByFilters.mockResolvedValue({
      data: [
        {
          id: 1,
          projectName: '雁塔区应急工程',
          address: '西安市雁塔区',
          province: '陕西省',
          city: '西安市',
          district: '雁塔区',
          longitude: '',
          latitude: ''
        }
      ]
    })

    getProjectDetail.mockResolvedValue({
      data: { id: 1, projectName: '雁塔区应急工程' }
    })

    const fetchMock = vi.fn(async (url) => {
      const map = {
        '/map-data/resource-manifest.json': {
          province: {
            陕西省: '/map-data/split/provinces/610000.geojson',
            default: '/map-data/split/provinces/610000.geojson'
          },
          city: {
            陕西省: '/map-data/split/city-groups/610000.geojson',
            default: '/map-data/split/city-groups/610000.geojson'
          },
          county: { '610100': '/map-data/split/county-groups/610100.geojson' },
          district: {
            '610113': '/map-data/split/counties/610113.geojson',
            '610116': '/map-data/split/counties/610116.geojson'
          }
        },
        '/map-data/split/provinces/610000.geojson': provinceGeoJson,
        '/map-data/split/city-groups/610000.geojson': cityGeoJson,
        '/map-data/split/county-groups/610100.geojson': countyGeoJson,
        '/map-data/split/counties/610113.geojson': {
          type: 'FeatureCollection',
          features: [countyGeoJson.features[0]]
        },
        '/map-data/split/counties/610116.geojson': {
          type: 'FeatureCollection',
          features: [countyGeoJson.features[1]]
        },
        '/map-data/province.geojson': provinceGeoJson,
        '/map-data/city.geojson': cityGeoJson,
        '/map-data/county.geojson': countyGeoJson
      }

      if (!map[url]) {
        return { ok: false, status: 404 }
      }

      return createJsonResponse(map[url])
    })

    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('requestAnimationFrame', (callback) => callback())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should drill from province to city to county and prefer manifest-based resources', async () => {
    const DashboardView = (await import('../../src/views/dashboard/index.vue')).default
    const wrapper = mount(DashboardView, {
      global: {
        stubs: globalStubs
      }
    })

    await flushAll()

    const provinceOption = setOption.mock.calls.at(-1)?.[0]
    expect(fetchProjectMapSummaryByFilters).toHaveBeenCalledTimes(1)
    expect(fetchProjectMapSummaryByFilters).toHaveBeenCalledWith('city', { province: '陕西省' })
    expect(fetchProjectMapListByFilters).not.toHaveBeenCalled()
    expect(provinceOption.series[0].data.map((item) => item.name)).toEqual(['西安市', '安康市'])
    expect(fetch).toHaveBeenCalledWith('/map-data/resource-manifest.json')
    expect(fetch).toHaveBeenCalledWith('/map-data/split/city-groups/610000.geojson')

    const renderCountBeforeCityClick = setOption.mock.calls.length
    await chartHandlers.click({ name: '西安市', data: { meta: { city: '西安市' } } })
    await flushAll()

    expect(fetchProjectMapSummaryByFilters).toHaveBeenCalledTimes(2)
    expect(fetchProjectMapSummaryByFilters).toHaveBeenLastCalledWith('district', { province: '陕西省', city: '西安市' })
    expect(fetchProjectMapListByFilters).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('西安市 区县分布')
    expect(fetch).toHaveBeenCalledWith('/map-data/split/county-groups/610100.geojson')

    const renderCountBeforeCountyClick = setOption.mock.calls.length
    await chartHandlers.click({ name: '雁塔区', data: { meta: { district: '雁塔区' } } })
    await flushAll()

    expect(fetchProjectMapListByFilters).toHaveBeenCalledTimes(1)
    expect(fetchProjectMapListByFilters).toHaveBeenCalledWith({ province: '陕西省', city: '西安市', district: '雁塔区' })
    expect(fetch).toHaveBeenCalledWith('/map-data/split/counties/610113.geojson')
    expect(setOption.mock.calls.length).toBeGreaterThan(renderCountBeforeCountyClick)
    expect(wrapper.text()).toContain('雁塔区 项目清单')
    expect(wrapper.find('[data-role="insight-list"]').text()).toContain('雁塔区应急工程')

    await chartHandlers.click({ data: { meta: { projectId: 1 } } })
    await flushAll()

    expect(getProjectDetail).toHaveBeenCalledWith(1)
  })

  it('should use generic city geojson directly when manifest is unavailable', async () => {
    const fetchMock = vi.fn(async (url) => {
      if (url === '/map-data/resource-manifest.json') {
        return createHtmlResponse()
      }
      if (url === '/map-data/city.geojson') {
        return createJsonResponse(cityGeoJson)
      }
      if (url === '/map-data/province.geojson') {
        return createJsonResponse(provinceGeoJson)
      }
      return { ok: false, status: 404 }
    })

    vi.stubGlobal('fetch', fetchMock)

    const DashboardView = (await import('../../src/views/dashboard/index.vue')).default
    const wrapper = mount(DashboardView, {
      global: {
        stubs: globalStubs
      }
    })

    await flushAll()

    expect(fetchMock).toHaveBeenCalledWith('/map-data/resource-manifest.json')
    expect(fetchMock).toHaveBeenCalledWith('/map-data/city.geojson')
    expect(fetchMock).not.toHaveBeenCalledWith('/map-data/陕西省_市.geojson')
    expect(showError).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('市级分布')
  })
})
