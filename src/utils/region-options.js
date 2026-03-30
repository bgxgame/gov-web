import { REGION_TREE } from '../constants/region-tree'

/**
 * 省市区联动选项工具。
 * 这里统一从静态树读取，避免页面各自拼装导致逻辑分叉。
 */

export const PROVINCE_OPTIONS = REGION_TREE.map((province) => ({
  label: province.label,
  value: province.value,
  adcode: province.adcode
}))

function cloneOptions(list = []) {
  return list.map((item) => ({ ...item }))
}

function findProvince(provinceName) {
  const target = String(provinceName || '').trim()
  if (!target) return undefined
  return REGION_TREE.find((item) => item.value === target)
}

function findCity(provinceName, cityName) {
  const province = findProvince(provinceName)
  const target = String(cityName || '').trim()
  if (!province || !target) return undefined
  return province.cities.find((item) => item.value === target)
}

export function getCityOptions(provinceName) {
  const province = findProvince(provinceName)
  return cloneOptions(province?.cities || [])
}

export function getDistrictOptions(provinceName, cityName) {
  const city = findCity(provinceName, cityName)
  return cloneOptions(city?.districts || [])
}

export function appendMissingOption(options, value) {
  const text = String(value || '').trim()
  if (!text) return cloneOptions(options)
  if (options.some((item) => item.value === text)) {
    return cloneOptions(options)
  }
  return [{ label: `${text}（历史数据）`, value: text }, ...cloneOptions(options)]
}

export function hasProvince(provinceName) {
  return Boolean(findProvince(provinceName))
}

export function hasCity(provinceName, cityName) {
  return Boolean(findCity(provinceName, cityName))
}

export function hasDistrict(provinceName, cityName, districtName) {
  const text = String(districtName || '').trim()
  if (!text) return false
  return getDistrictOptions(provinceName, cityName).some((item) => item.value === text)
}
