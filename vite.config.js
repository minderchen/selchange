import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages is hosted at /selchange/.
// EdgeOne Pages uses the domain root (/).
export default defineConfig({
  plugins: [react()],
  base: process.env.DEPLOY_TARGET === 'edgeone' ? '/' : '/selchange/',
})
