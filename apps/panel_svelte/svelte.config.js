import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
export default {
  preprocess: vitePreprocess(),
  kit: {
    // Sitio estático sin servidor: `dist/` con el shell (index.html) como página de respaldo.
    adapter: adapter({ pages: 'dist', assets: 'dist', fallback: 'index.html' }),
    // El hosting no devuelve index.html para otras rutas: las URLs son `#/planes`. Con el router por
    // hash Kit ya no hace SSR ni prerender, y el build falla si una ruta declara `ssr` o `prerender`.
    router: { type: 'hash' },
    // `$lib` ya viene de Kit; los helpers de los tests viven fuera de `src/`.
    alias: { $tests: 'tests' },
  },
};
