import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    // La logica in engine/ è pura: non serve un ambiente DOM.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
