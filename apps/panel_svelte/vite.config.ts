import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss(), svelte()],
  // `@/…` = src/ (`/src` es relativo a la raíz): los imports no dependen de cuántos `../` hay.
  resolve: { alias: { '@': '/src' } },
});
