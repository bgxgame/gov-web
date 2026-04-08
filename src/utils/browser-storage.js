const TOKEN_KEY = 'token'
const USER_INFO_KEY = 'user_info'

function getStorage(type) {
  if (typeof window === 'undefined') return null
  if (type === 'local') {
    return window.localStorage || null
  }
  if (type === 'session') {
    return window.sessionStorage || null
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

export function getTokenStorageKey() {
  return TOKEN_KEY
}

export function getUserInfoStorageKey() {
  return USER_INFO_KEY
}

export function readToken() {
  return getLocalValue(TOKEN_KEY)
}

export function writeToken(token) {
  if (token) {
    return setLocalValue(TOKEN_KEY, token)
  }
  return removeLocalValue(TOKEN_KEY)
}

export function readUserInfoCache() {
  return readJsonFromLocalStorage(USER_INFO_KEY)
}

export function writeUserInfoCache(userInfo) {
  if (userInfo) {
    return writeJsonToLocalStorage(USER_INFO_KEY, userInfo)
  }
  return removeLocalValue(USER_INFO_KEY)
}

export function clearAuthStorage() {
  removeLocalValue(TOKEN_KEY)
  removeLocalValue(USER_INFO_KEY)
}
