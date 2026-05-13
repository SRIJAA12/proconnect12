import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  // App is served behind nginx under /proconnect/
  base: '/proconnect/',
  plugins: [react()],
  server: {
    port: 3035,
    strictPort: true,
    // Local dev convenience: allow /proconnectBackend/* to hit the Flask backend
    proxy: {
      '/proconnectBackend': {
        target: 'http://127.0.0.1:3036',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 3035,
    strictPort: true,
  },
})
