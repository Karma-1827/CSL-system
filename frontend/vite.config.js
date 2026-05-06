import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite' // 👈 1. 新增這行引入 Tailwind
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(), // 👈 2. 新增這行啟動外掛
    react()
  ],
})