import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import axios from 'axios'
import './index.css'
import App from './App.tsx'

// In dev: leave baseURL empty so Vite's proxy handles /dashboard, /agents, etc.
// In prod (Netlify): point at the deployed backend on Render.
const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || ''
if (apiBase) axios.defaults.baseURL = apiBase

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
