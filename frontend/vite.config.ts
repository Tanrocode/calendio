import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true, // listen on 0.0.0.0 so http://127.0.0.1:3000 works (needed for session cookies with Flask on 127.0.0.1)
  },
})
