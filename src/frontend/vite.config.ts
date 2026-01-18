import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  root: '.',
  publicDir: './public',
  build: {
    outDir: '../../dist',
    emptyOutDir: true
  },
  plugins: [react()],
  server: {
    port: 3000,
    open: true
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './test/setup.ts',
  },
})
