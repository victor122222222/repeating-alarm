import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url))

// Compila la web como páginas estáticas para meterlas dentro de la app Android
// (android/app/src/main/assets/web). No usa Netlify ni el servidor de TanStack Start.
// Uso: pnpm exec vite build --config vite.android.config.ts
export default defineConfig({
  root: here('./android-web'),
  base: './',
  publicDir: here('./public'),
  resolve: {
    alias: [{ find: /^@\//, replacement: `${here('./src')}/` }],
  },
  plugins: [tailwindcss(), viteReact()],
  build: {
    outDir: here('./android/app/src/main/assets/web'),
    emptyOutDir: true,
  },
})
