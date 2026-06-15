import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3000,
    host: true,
    allowedHosts: ['.ngrok-free.dev', '.ngrok-free.app', 'localhost', '127.0.0.1'],
    proxy: {
      '/api': {
        target: 'http://backend:8000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://backend:8000',
        ws: true,
        changeOrigin: true,
      }
    }
  }
})
