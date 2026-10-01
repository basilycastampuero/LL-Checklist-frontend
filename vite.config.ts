/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // host: true expone el servidor en 0.0.0.0 — necesario para acceder desde
    // fuera del contenedor Docker (localhost del host -> puerto mapeado).
    host: true,
    // ADR-005: same-origin en producción. En dev, cuando VITE_API_MODE=real,
    // el backend de Odoo se sirve por proxy para que la cookie de sesión funcione.
    proxy: {
      '/api': {
        target: process.env.VITE_ODOO_URL ?? 'http://localhost:8069',
        changeOrigin: true,
      },
      '/web/image': {
        target: process.env.VITE_ODOO_URL ?? 'http://localhost:8069',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
    // La suite corre SIEMPRE en modo mock, sin importar el `.env.local` de la
    // máquina. Sin esto, cualquiera que deje `VITE_API_MODE=real` para probar
    // contra el Odoo local se encuentra con tres tests en rojo que no tienen
    // nada que ver con su cambio: Vitest carga los `.env`, así que
    // `features.ratings`/`watchDates` (ADR-004, activos solo en mock) se apagan
    // y los tests que ejercitan el puntaje y el botón de Twitch dejan de
    // encontrar sus controles. Pasó el 2026-09-30 y costó un rato entender que
    // el rojo venía del entorno y no del código.
    //
    // Es coherente con lo que la suite ya asume en todo lo demás: los tests
    // corren contra los handlers de MSW (`server.listen` en `setup.ts`), nunca
    // contra un backend real. El modo tenía que decirlo explícitamente.
    //
    // Ojo: esto pisa también la variable pasada a mano en la shell, así que
    // `VITE_API_MODE=real npx vitest run` NO cambia nada (comprobado). Es
    // deliberado —no hay escenario de test que corra contra el backend real—,
    // pero si algún día hace falta uno, el lugar a cambiar es esta línea.
    env: { VITE_API_MODE: 'mock' },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/**/*.d.ts'],
    },
  },
})
