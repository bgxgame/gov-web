import { appConfig } from '../config/app-config'
import {
  getLocalStorageObject,
  getSessionStorageObject,
  readDocumentCookie,
  writeDocumentCookie
} from './browser-runtime'

const USER_INFO_KEY = 'user_info'
const LEGACY_TOKEN_KEY = 'token'

function getStorage(type) {
  if (type === 'local') {
    return getLocalStorageObject()
  }
  if (type === 'session') {
    return getSessionStorageObject()
  }
  return null
}

function readValue(type, key) {
  const storage = getStorage(type)
  if (!storage) return ''
  try {
    return storage.getItem(key) || ''
  } catch (error) {
    return ''
  }
}

function writeValue(type, key, value) {
  const storage = getStorage(type)
  if (!storage) return false
  try {
    storage.setItem(key, value)
    return true
  } catch (error) {
    return false
  }
}

function removeValue(type, key) {
  const storage = getStorage(type)
  if (!storage) return false
  try {
    storage.removeItem(key)
    return true
  } catch (error) {
    return false
  }
}

export function getLocalValue(key) {
  return readValue('local', key)
}

export function setLocalValue(key, value) {
  return writeValue('local', key, String(value ?? ''))
}

export function removeLocalValue(key) {
  return removeValue('local', key)
}

export function getSessionValue(key) {
  return readValue('session', key)
}

export function setSessionValue(key, value) {
  return writeValue('session', key, String(value ?? ''))
}

export function removeSessionValue(key) {
  return removeValue('session', key)
}

export function readJsonFromLocalStorage(key) {
  const raw = getLocalValue(key)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch (error) {
    return null
  }
}

export function readJsonFromSessionStorage(key) {
  const raw = getSessionValue(key)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch (error) {
    return null
  }
}

export function writeJsonToLocalStorage(key, value) {
  try {
    return setLocalValue(key, JSON.stringify(value))
  } catch (error) {
    return false
  }
}

export function writeJsonToSessionStorage(key, value) {
  try {
    return setSessionValue(key, JSON.stringify(value))
  } catch (error) {
    return false
  }
}

export function getUserInfoStorageKey() {
  return USER_INFO_KEY
}

export function readCookieValue(name) {
  const rawCookie = readDocumentCookie()
  if (!rawCookie) return ''
  const targetPrefix = `${String(name || '').trim()}=`
  if (!targetPrefix || targetPrefix === '=') return ''
  const matched = rawCookie
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(targetPrefix))
  if (!matched) return ''
  return decodeURIComponent(matched.slice(targetPrefix.length))
}

export function clearCookieValue(name, path = '/') {
  const normalizedName = String(name || '').trim()
  if (!normalizedName) return
  writeDocumentCookie(`${normalizedName}=; Path=${path}; Max-Age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`)
}

export function readCsrfToken() {
  return readCookieValue(appConfig.csrfCookieName)
}

export function clearCsrfToken() {
  clearCookieValue(appConfig.csrfCookieName)
}

function migrateLegacyUserInfo() {
  const legacyUserInfo = readJsonFromLocalStorage(USER_INFO_KEY)
  if (!legacyUserInfo) return null
  writeJsonToSessionStorage(USER_INFO_KEY, legacyUserInfo)
  removeLocalValue(USER_INFO_KEY)
  return legacyUserInfo
}

export function readUserInfoCache() {
  return readJsonFromSessionStorage(USER_INFO_KEY) || migrateLegacyUserInfo()
}

export function writeUserInfoCache(userInfo) {
  if (userInfo) {
    removeLocalValue(USER_INFO_KEY)
    return writeJsonToSessionStorage(USER_INFO_KEY, userInfo)
  }
  removeSessionValue(USER_INFO_KEY)
  return removeLocalValue(USER_INFO_KEY)
}

export function hasAuthSessionHint() {
  return Boolean(readCsrfToken() || readUserInfoCache())
}

export function clearLegacyTokenStorage() {
  removeLocalValue(LEGACY_TOKEN_KEY)
  removeSessionValue(LEGACY_TOKEN_KEY)
}

export function clearAuthStorage() {
  clearLegacyTokenStorage()
  removeSessionValue(USER_INFO_KEY)
  removeLocalValue(USER_INFO_KEY)
  clearCsrfToken()
}
