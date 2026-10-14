import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
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
    // Las pruebas que llenan formularios con userEvent tardan más que el límite
    // de 5 s cuando la suite corre en paralelo en el CI.
    testTimeout: 15_000,
  },
})
