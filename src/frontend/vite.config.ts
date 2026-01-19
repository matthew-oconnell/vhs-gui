import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  publicDir: path.resolve(__dirname, '../../public'),
  build: {
    minify: false, // Temporarily disable minification for debugging
    sourcemap: true,
  },
  server: {
    port: 3000,
    open: true
  },
  // @ts-ignore - test config is for vitest
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './test/setup.ts',
  },
})
