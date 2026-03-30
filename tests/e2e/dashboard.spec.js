import { expect, test } from '@playwright/test'

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

test('首页地图应支持省市县下钻并展示项目详情', async ({ page }) => {
  test.slow()

  await page.route('**/api/system/frontend-monitor/report', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 200,
        msg: '操作成功',
        data: true
      })
    })
  })

  await page.addInitScript(() => {
    window.localStorage.setItem('token', 'token-dashboard')
    window.localStorage.setItem(
      'user_info',
      JSON.stringify({
        userId: 1,
        username: 'admin',
        roleCodes: ['admin', 'user'],
        menuKeys: ['dashboard:view']
      })
    )
  })

  await page.route('**/api/project/map/summary**', async (route) => {
    const url = new URL(route.request().url())
    const level = url.searchParams.get('level')
    const city = url.searchParams.get('city')
    const data =
      level === 'district' && city === '西安市'
        ? [
            { regionLevel: 'district', regionName: '雁塔区', projectCount: 1 },
            { regionLevel: 'district', regionName: '长安区', projectCount: 1 }
          ]
        : [
            { regionLevel: 'city', regionName: '西安市', projectCount: 2 },
            { regionLevel: 'city', regionName: '安康市', projectCount: 1 }
          ]

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 200,
        msg: '操作成功',
        data
      })
    })
  })

  await page.route('**/api/project/map/list**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 200,
        msg: '操作成功',
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
    })
  })

  await page.route('**/api/project/get/1', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 200,
        msg: '操作成功',
        data: {
          id: 1,
          projectName: '雁塔区应急工程',
          projectCode: 'P-001',
          address: '西安市雁塔区',
          province: '陕西省',
          city: '西安市',
          district: '雁塔区',
          leaderName: '张工',
          leaderPhone: '13800000000',
          description: '重点项目'
        }
      })
    })
  })

  await page.route('**/map-data/**', async (route) => {
    const requestUrl = decodeURIComponent(new URL(route.request().url()).pathname)

    if (requestUrl.endsWith('/resource-manifest.json')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          province: {
            陕西省: '/map-data/split/provinces/610000.geojson',
            default: '/map-data/split/provinces/610000.geojson'
          },
          city: {
            陕西省: '/map-data/split/city-groups/610000.geojson',
            default: '/map-data/split/city-groups/610000.geojson'
          },
          county: { '610100': '/map-data/split/county-groups/610100.geojson' }
        })
      })
      return
    }

    if (requestUrl.endsWith('/split/provinces/610000.geojson')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(provinceGeoJson)
      })
      return
    }

    if (requestUrl.endsWith('/split/city-groups/610000.geojson')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(cityGeoJson)
      })
      return
    }

    if (requestUrl.endsWith('/split/county-groups/610100.geojson')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(countyGeoJson)
      })
      return
    }

    if (requestUrl.endsWith('/province.geojson')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(provinceGeoJson)
      })
      return
    }

    await route.fulfill({
      status: 404,
      contentType: 'text/plain',
      body: 'not found'
    })
  })

  await page.goto('/dashboard', { waitUntil: 'networkidle' })

  await expect(page.getByText('市级分布')).toBeVisible()
  await page.locator('[data-role="insight-list"] button').filter({ hasText: '西安市' }).click()
  await expect(page.getByText('西安市 区县分布')).toBeVisible()

  await page.locator('[data-role="insight-list"] button').filter({ hasText: '雁塔区' }).click()
  await expect(page.getByText('雁塔区 项目清单')).toBeVisible()

  await page.locator('[data-role="insight-list"] button').filter({ hasText: '雁塔区应急工程' }).click()
  await expect(page.getByText('项目详情')).toBeVisible()
  await expect(page.getByText('重点项目')).toBeVisible()
})
