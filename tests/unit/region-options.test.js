import { describe, expect, it } from 'vitest'
import {
  PROVINCE_OPTIONS,
  appendMissingOption,
  getCityOptions,
  getDistrictOptions,
  hasCity,
  hasDistrict
} from '../../src/utils/region-options'

describe('region-options', () => {
  it('should expose province, city and district options from split map resources', () => {
    expect(PROVINCE_OPTIONS.some((item) => item.value === '陕西省')).toBe(true)

    const cityOptions = getCityOptions('陕西省')
    expect(cityOptions.some((item) => item.value === '西安市')).toBe(true)

    const districtOptions = getDistrictOptions('陕西省', '西安市')
    expect(districtOptions.some((item) => item.value === '雁塔区')).toBe(true)
    expect(districtOptions.some((item) => item.value === '岐山县')).toBe(false)
  })

  it('should report hierarchy existence correctly', () => {
    expect(hasCity('陕西省', '宝鸡市')).toBe(true)
    expect(hasCity('陕西省', '不存在城市')).toBe(false)
    expect(hasDistrict('陕西省', '宝鸡市', '岐山县')).toBe(true)
    expect(hasDistrict('陕西省', '西安市', '岐山县')).toBe(false)
  })

  it('should keep legacy region values visible during edit fallback', () => {
    const options = appendMissingOption(getCityOptions('陕西省'), '历史城市')
    expect(options[0]).toEqual({
      label: '历史城市（历史数据）',
      value: '历史城市'
    })
  })
})
