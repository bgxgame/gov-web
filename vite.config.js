import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

function resolveElementPlusChunk(id) {
  if (id.includes('@element-plus/icons-vue')) return 'ep-icons'
  if (!id.includes('element-plus')) return null

  const normalizedId = id.replace(/\\/g, '/')
  if (normalizedId.includes('/components/table') || normalizedId.includes('/components/pagination') || normalizedId.includes('/components/descriptions')) {
    return 'ep-data'
  }
  if (
    normalizedId.includes('/components/dialog') ||
    normalizedId.includes('/components/drawer') ||
    normalizedId.includes('/components/message') ||
    normalizedId.includes('/components/message-box') ||
    normalizedId.includes('/components/notification') ||
    normalizedId.includes('/components/loading') ||
    normalizedId.includes('/components/overlay')
  ) {
    return 'ep-feedback'
  }
  if (
    normalizedId.includes('/components/form') ||
    normalizedId.includes('/components/input') ||
    normalizedId.includes('/components/select') ||
    normalizedId.includes('/components/option') ||
    normalizedId.includes('/components/date-picker') ||
    normalizedId.includes('/components/radio') ||
    normalizedId.includes('/components/checkbox')
  ) {
    return 'ep-form'
  }
  if (
    normalizedId.includes('/components/menu') ||
    normalizedId.includes('/components/sub-menu') ||
    normalizedId.includes('/components/dropdown') ||
    normalizedId.includes('/components/button') ||
    normalizedId.includes('/components/card') ||
    normalizedId.includes('/components/tag') ||
    normalizedId.includes('/components/avatar') ||
    normalizedId.includes('/components/icon')
  ) {
    return 'ep-navigation'
  }
  return 'vendor-element-plus-core'
}

export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      resolvers: [ElementPlusResolver()],
      dts: false
    }),
    Components({
      resolvers: [ElementPlusResolver({ importStyle: 'css' })],
      dts: false
    })
  ],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          const elementPlusChunk = resolveElementPlusChunk(id)
          if (elementPlusChunk) return elementPlusChunk
          if (id.includes('axios')) return 'vendor-axios'
          if (id.includes('vue-router') || id.includes('/vue/') || id.includes('pinia')) return 'vendor-vue'
        }
      }
    }
  }
})
