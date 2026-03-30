import { describe, expect, it } from 'vitest'
import {
  buildRegionCountMap,
  extractRegionAdcode,
  filterCountyGeoJsonByCity,
  getFeatureCenter,
  getRegionCount,
  normalizeRegionName,
  resolveManifestMapResource,
  resolveMapResourceCacheKey,
  resolveMapResourceCandidates,
  resolveProjectPoint
} from '../../src/utils/map-drilldown'

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

describe('map-drilldown utils', () => {
  it('should normalize region names and extract the last 6 digits from region codes', () => {
    expect(normalizeRegionName('西安市')).toBe('西安')
    expect(normalizeRegionName('雁塔区')).toBe('雁塔')
    expect(extractRegionAdcode('156610900')).toBe('610900')
    expect(extractRegionAdcode('610100')).toBe('610100')
  })

  it('should filter county geojson by the selected city code prefix', () => {
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
        createSquareFeature('长安区', '156610116', 108.9, 34.1),
        createSquareFeature('汉滨区', '156610902', 109.1, 32.5)
      ]
    }

    const result = filterCountyGeoJsonByCity(countyGeoJson, cityGeoJson, '西安市')

    expect(result.features).toHaveLength(2)
    expect(result.features.map((item) => item.properties.name)).toEqual(['雁塔区', '长安区'])
  })

  it('should calculate the geometric center of a feature from its coordinates', () => {
    const feature = createSquareFeature('西安市', '156610100', 108, 34)
    expect(getFeatureCenter(feature)).toEqual([108.5, 34.5])
  })

  it('should build region counts that can be resolved by exact or normalized names', () => {
    const countMap = buildRegionCountMap([
      { city: '西安市' },
      { city: '西安市' },
      { city: '安康市' }
    ], 'city')

    expect(getRegionCount(countMap, '西安市')).toBe(2)
    expect(getRegionCount(countMap, '西安')).toBe(2)
    expect(getRegionCount(countMap, '安康市')).toBe(1)
    expect(getRegionCount(countMap, '宝鸡市')).toBe(0)
  })

  it('should fallback to region centers when the project has no longitude and latitude', () => {
    const districtFeature = createSquareFeature('雁塔区', '156610113', 108.8, 34.1)
    const cityFeature = createSquareFeature('西安市', '156610100', 108, 34)

    expect(resolveProjectPoint({ longitude: 108.95, latitude: 34.22 }, [districtFeature])).toEqual([108.95, 34.22])
    expect(resolveProjectPoint({ longitude: '', latitude: '' }, [districtFeature, cityFeature])).toEqual([109.3, 34.6])
    expect(resolveProjectPoint({ longitude: null, latitude: null }, [], [1, 2])).toEqual([1, 2])
  })

  it('should resolve layered resource candidates for city and county drilldown', () => {
    expect(resolveMapResourceCandidates('city', { provinceName: '陕西省' })).toContain('/map-data/陕西省_市.geojson')
    expect(
      resolveMapResourceCandidates('county', { cityName: '西安市', cityAdcode: '610100' }).slice(0, 3)
    ).toEqual(['/map-data/610100.geojson', '/map-data/610100.json', '/map-data/西安市_县.geojson'])
  })

  it('should resolve manifest resource first and build stable cache keys', () => {
    const manifest = {
      province: {
        陕西省: '/map-data/split/provinces/610000.geojson',
        default: '/map-data/split/provinces/610000.geojson'
      },
      city: {
        陕西省: '/map-data/split/city-groups/610000.geojson',
        default: '/map-data/split/city-groups/610000.geojson'
      },
      county: {
        '610100': '/map-data/split/county-groups/610100.geojson'
      },
      district: {
        '610113': '/map-data/split/counties/610113.geojson'
      }
    }

    expect(resolveManifestMapResource('province', { provinceName: '陕西省' }, manifest)).toEqual([
      '/map-data/split/provinces/610000.geojson'
    ])
    expect(resolveManifestMapResource('city', { provinceName: '陕西省' }, manifest)).toEqual([
      '/map-data/split/city-groups/610000.geojson'
    ])
    expect(resolveManifestMapResource('county', { cityAdcode: '610100', cityName: '西安市' }, manifest)).toEqual([
      '/map-data/split/county-groups/610100.geojson'
    ])
    expect(resolveManifestMapResource('district', { districtAdcode: '610113', districtName: '雁塔区' }, manifest)).toEqual([
      '/map-data/split/counties/610113.geojson'
    ])
    expect(resolveMapResourceCacheKey('district', {
      provinceName: '陕西省',
      cityName: '西安市',
      cityAdcode: '610100',
      districtName: '雁塔区',
      districtAdcode: '610113'
    })).toBe(
      'district|陕西省||西安市|610100|雁塔区|610113'
    )
  })
})
