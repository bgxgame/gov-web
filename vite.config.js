import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

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
          if (id.includes('element-plus') || id.includes('@element-plus')) return 'vendor-element-plus'
          if (id.includes('echarts')) return 'vendor-echarts'
          if (id.includes('axios')) return 'vendor-axios'
          if (id.includes('vue-router') || id.includes('/vue/') || id.includes('pinia')) return 'vendor-vue'
          return 'vendor-misc'
        }
      }
    }
  }
})
