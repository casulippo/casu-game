import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // Three.js (~540 kB) sta in un pacchetto a parte, scaricato solo aprendo il campo 3D.
    chunkSizeWarningLimit: 600,
  },
  server: {
    // Espone il dev server in rete locale: con `npm run dev` puoi aprire il
    // gioco dal telefono sulla stessa wifi, senza aspettare il deploy.
    host: true,
  },
  test: {
    // La logica in engine/ è pura: non serve un ambiente DOM.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
