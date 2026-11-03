<script lang="ts">
  import type { Snippet } from 'svelte';

  /** Contenedor de una pantalla del panel: mismo aire a los lados y arriba, contenido centrado hasta `ancho` px. */
  let { ancho = 1096, children }: { ancho?: number; children: Snippet } = $props();
</script>

<div class="aparecer px-4 pt-6 pb-10 sm:px-6 lg:px-10 lg:pt-9">
  <div class="mx-auto" style="max-width:{ancho}px">{@render children()}</div>
</div>
