import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Con VITE_API_MOCK=false, las llamadas a /api van al backend local.
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
  test: {
    // Simula el DOM del navegador para React Testing Library.
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
  },
})
