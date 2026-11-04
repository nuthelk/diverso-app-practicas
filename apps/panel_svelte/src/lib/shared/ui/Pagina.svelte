<script module lang="ts">
  export const ANCHO_DATOS = 1920;
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';

  /**
   * Contenedor de una pantalla del panel: mismo aire a los lados y arriba. Las pantallas de datos llenan todo el ancho
   * (tope `ANCHO_DATOS` para pantallas gigantes); los formularios y textos de lectura pasan un `ancho` menor para
   * que las líneas sigan siendo cómodas de leer.
   */
  let { ancho = ANCHO_DATOS, children }: { ancho?: number; children: Snippet } = $props();
</script>

<div class="aparecer px-4 pt-6 pb-12 sm:px-6 lg:px-10 lg:pt-8">
  <div class="mx-auto" style="max-width:{ancho}px">{@render children()}</div>
</div>
