import { beforeEach } from 'vitest'
import { config } from '@vue/test-utils'

config.global.directives = {
  ...(config.global.directives || {}),
  loading: {
    mounted() {},
    updated() {}
  }
}

beforeEach(() => {
  window.localStorage.clear()
  window.sessionStorage.clear()
  document.cookie = 'XSRF-TOKEN=; Max-Age=0; Path=/'
})
