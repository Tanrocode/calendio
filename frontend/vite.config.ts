import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react()],
  server: {
    port: 3000,
    host: true,
    // Only proxy API paths — not `/dashboard` (React route) or you get a redirect loop
    // with the backend 307 to the same URL.
    proxy: {
      '/dashboard/metrics': { target: 'http://localhost:8000', changeOrigin: true },
      '/agents': { target: 'http://localhost:8000', changeOrigin: true },
      '/auth/url': { target: 'http://localhost:8000', changeOrigin: true },
      '/oauth': { target: 'http://localhost:8000', changeOrigin: true },
      '/calendar-demo': { target: 'http://localhost:8000', changeOrigin: true },
      '/add-event': { target: 'http://localhost:8000', changeOrigin: true },
    },
  },
})
