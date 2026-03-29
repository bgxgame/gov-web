import { appConfig } from '../config/app-config'

const LEVEL_MAP = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
}

const SENSITIVE_KEYS = ['password', 'token', 'authorization', 'phone', 'secret', 'key']

function resolveCurrentLevel() {
  const configured = appConfig.logLevel
  return LEVEL_MAP[configured] ? configured : 'warn'
}

function shouldLog(level) {
  return LEVEL_MAP[level] >= LEVEL_MAP[resolveCurrentLevel()]
}

function maskText(value) {
  const text = String(value)
  if (text.length <= 4) return '****'
  return `${text.slice(0, 2)}****${text.slice(-2)}`
}

function sanitizeValue(value, depth = 0) {
  if (value === null || value === undefined) return value
  if (depth > 3) return '[MaxDepth]'
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, depth + 1))
  }
  if (typeof value === 'object') {
    return Object.keys(value).reduce((result, key) => {
      const lowerKey = key.toLowerCase()
      if (SENSITIVE_KEYS.some((sensitive) => lowerKey.includes(sensitive))) {
        result[key] = maskText(value[key])
      } else {
        result[key] = sanitizeValue(value[key], depth + 1)
      }
      return result
    }, {})
  }
  return value
}

function print(level, args) {
  if (!shouldLog(level)) return
  const fn = console[level] || console.log
  fn(`[${appConfig.appName}]`, ...args.map((item) => sanitizeValue(item)))
}

export const logger = {
  debug(...args) {
    print('debug', args)
  },
  info(...args) {
    print('info', args)
  },
  warn(...args) {
    print('warn', args)
  },
  error(...args) {
    print('error', args)
  }
}
