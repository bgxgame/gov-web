import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

const ELEMENT_PLUS_OPTIMIZE_DEPS = [
  'element-plus/es',
  'element-plus/es/components/base/style/css',
  'element-plus/es/components/config-provider/style/css',
  'element-plus/es/components/message/style/css',
  'element-plus/es/components/message-box/style/css',
  'element-plus/es/components/aside/style/css',
  'element-plus/es/components/avatar/style/css',
  'element-plus/es/components/button/style/css',
  'element-plus/es/components/card/style/css',
  'element-plus/es/components/checkbox/style/css',
  'element-plus/es/components/checkbox-group/style/css',
  'element-plus/es/components/col/style/css',
  'element-plus/es/components/container/style/css',
  'element-plus/es/components/date-picker/style/css',
  'element-plus/es/components/descriptions/style/css',
  'element-plus/es/components/descriptions-item/style/css',
  'element-plus/es/components/dialog/style/css',
  'element-plus/es/components/drawer/style/css',
  'element-plus/es/components/dropdown/style/css',
  'element-plus/es/components/dropdown-item/style/css',
  'element-plus/es/components/dropdown-menu/style/css',
  'element-plus/es/components/empty/style/css',
  'element-plus/es/components/form/style/css',
  'element-plus/es/components/form-item/style/css',
  'element-plus/es/components/icon/style/css',
  'element-plus/es/components/input/style/css',
  'element-plus/es/components/loading/style/css',
  'element-plus/es/components/main/style/css',
  'element-plus/es/components/menu/style/css',
  'element-plus/es/components/menu-item/style/css',
  'element-plus/es/components/option/style/css',
  'element-plus/es/components/pagination/style/css',
  'element-plus/es/components/radio/style/css',
  'element-plus/es/components/radio-group/style/css',
  'element-plus/es/components/row/style/css',
  'element-plus/es/components/select/style/css',
  'element-plus/es/components/space/style/css',
  'element-plus/es/components/sub-menu/style/css',
  'element-plus/es/components/switch/style/css',
  'element-plus/es/components/tab-pane/style/css',
  'element-plus/es/components/table/style/css',
  'element-plus/es/components/table-column/style/css',
  'element-plus/es/components/tabs/style/css',
  'element-plus/es/components/tag/style/css'
]

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
      resolvers: [ElementPlusResolver({ importStyle: 'css' })],
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
  optimizeDeps: {
    include: [
      'vue',
      'vue-router',
      'pinia',
      'axios',
      '@element-plus/icons-vue',
      'echarts/core',
      'echarts/components',
      'echarts/charts',
      'echarts/renderers',
      ...ELEMENT_PLUS_OPTIMIZE_DEPS
    ]
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
