<script lang="ts">
  import Pagina from './Pagina.svelte';
  import Skeleton from './Skeleton.svelte';

  /** Marcadores de carga de una pantalla: `filas` bloques con la altura de `clase`. */
  let { filas = 4, clase = 'h-14', ancho = 1096 }: { filas?: number; clase?: string; ancho?: number } = $props();
</script>

<Pagina {ancho}>
  <div class="space-y-3" role="status" aria-label="Cargando">
    <Skeleton clase="h-14 w-80 max-w-full rounded-lg" />
    {#each Array(filas) as _, i (i)}<Skeleton clase={clase} />{/each}
  </div>
</Pagina>
