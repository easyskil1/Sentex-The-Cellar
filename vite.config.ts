import { defineConfig } from 'vite';

/**
 * Publikus játék-build (GENERÁLT - lásd a fő repó scripts/build-public.mjs-ét).
 * Relatív `base`, hogy a játék GitHub Pages alkönyvtárból
 * (easyskil1.github.io/Sentex-The-Cellar/) is helyesen töltse az assetjeit.
 * A fejlesztői admin (és a dev mentő-pluginek) nincsenek a publikus tükörben.
 */
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    outDir: 'dist',
  },
  server: {
    port: 5173,
    open: true,
  },
});
