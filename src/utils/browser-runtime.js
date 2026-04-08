function getWindow() {
  return typeof window === 'undefined' ? null : window
}

export function hasWindow() {
  return getWindow() !== null
}

export function getRuntimeAppConfig() {
  const win = getWindow()
  return win && win.__APP_CONFIG__ ? win.__APP_CONFIG__ : {}
}

export function getLocationObject() {
  const win = getWindow()
  return win && win.location ? win.location : null
}

export function getLocationOrigin() {
  return getLocationObject()?.origin || ''
}

export function getCurrentPath() {
  const location = getLocationObject()
  if (!location) return ''
  return `${location.pathname || ''}${location.search || ''}${location.hash || ''}`
}

export function replaceLocation(url) {
  const location = getLocationObject()
  if (!location || typeof location.replace !== 'function') return
  location.replace(url)
}

export function fetchWithRuntime(input, init) {
  const win = getWindow()
  if (!win || typeof win.fetch !== 'function') {
    throw new Error('window.fetch is not available')
  }
  return win.fetch(input, init)
}

export function addWindowEventListener(eventName, handler, options) {
  const win = getWindow()
  if (!win || typeof win.addEventListener !== 'function') return
  win.addEventListener(eventName, handler, options)
}

export function removeWindowEventListener(eventName, handler, options) {
  const win = getWindow()
  if (!win || typeof win.removeEventListener !== 'function') return
  win.removeEventListener(eventName, handler, options)
}

export function dispatchWindowEvent(event) {
  const win = getWindow()
  if (!win || typeof win.dispatchEvent !== 'function') return false
  return win.dispatchEvent(event)
}

export function setRuntimeTimeout(handler, delay) {
  const win = getWindow()
  if (!win || typeof win.setTimeout !== 'function') return null
  return win.setTimeout(handler, delay)
}

export function clearRuntimeTimeout(timer) {
  const win = getWindow()
  if (!win || timer === null || timer === undefined || typeof win.clearTimeout !== 'function') return
  win.clearTimeout(timer)
}

export function setRuntimeInterval(handler, delay) {
  const win = getWindow()
  if (!win || typeof win.setInterval !== 'function') return null
  return win.setInterval(handler, delay)
}

export function clearRuntimeInterval(timer) {
  const win = getWindow()
  if (!win || timer === null || timer === undefined || typeof win.clearInterval !== 'function') return
  win.clearInterval(timer)
}

export function requestIdleRuntimeCallback(handler, options) {
  const win = getWindow()
  if (!win) return null
  if (typeof win.requestIdleCallback === 'function') {
    return win.requestIdleCallback(handler, options)
  }
  return setRuntimeTimeout(handler, options?.timeout || 1)
}

export function getRuntimeGlobal(name) {
  const win = getWindow()
  return win ? win[name] : undefined
}

export function setRuntimeGlobal(name, value) {
  const win = getWindow()
  if (!win) return
  win[name] = value
}

export function getSessionStorageObject() {
  const win = getWindow()
  return win && win.sessionStorage ? win.sessionStorage : null
}
