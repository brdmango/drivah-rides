import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

// Two entry points: the marketing site at / and the React app at /app.
// They share the repo but not a bundle — the landing page ships no React.
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        site: resolve(__dirname, 'index.html'),
        app:  resolve(__dirname, 'app/index.html'),
      },
    },
  },
})
