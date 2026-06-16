import { defineConfig } from 'vite';

/**
 * Publikus játék-build. Relatív `base`, hogy a játék GitHub Pages alkönyvtárból
 * is betöltsön (pl. https://easyskil1.github.io/Sentex-The-Cellar/).
 * A fejlesztői admin-mentő végpontok NINCSENEK itt — azok a privát fejlesztői
 * repóban élnek.
 */
export default defineConfig({
  base: './',
  server: {
    port: 5173,
    open: true,
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
  },
});
