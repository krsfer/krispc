import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  plugins: [
    vue(),
    ViteImageOptimizer({
      webp: {
        quality: 80
      },
      png: {
        quality: 80
      },
      jpeg: {
        quality: 80
      }
    })
  ],
  root: resolve(__dirname, './krispc/static/src'),
  base: '/static/',
  build: {
    manifest: true,
    outDir: resolve(__dirname, './krispc/static/dist'),
    rollupOptions: {
      input: {
        main: resolve(__dirname, './krispc/static/src/main.js'),
      },
    },
  },
  server: {
    host: 'localhost',
    port: 5173,
    origin: 'http://localhost:5173',
    cors: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './krispc/static/src'),
      '~': resolve(__dirname, './krispc/static/src'),
    }
  }
})
