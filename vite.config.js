import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080', // 指向你的 Java 后端
        changeOrigin: true,
        // 不用重写，因为我们后端 application.yml 配了 context-path: /api
      }
    }
  }
})