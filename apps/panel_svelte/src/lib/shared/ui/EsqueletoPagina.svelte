<script lang="ts">
  import Pagina, { ANCHO_DATOS } from './Pagina.svelte';
  import Skeleton from './Skeleton.svelte';

  /** Marcadores de carga de una pantalla: `filas` bloques con la altura de `clase`. */
  let { filas = 4, clase = 'h-14', ancho = ANCHO_DATOS }: { filas?: number; clase?: string; ancho?: number } = $props();
</script>

<Pagina {ancho}>
  <div class="space-y-3" role="status" aria-label="Cargando">
    <Skeleton clase="h-14 w-80 max-w-full rounded-hoja-chica" />
    {#each Array(filas) as _, i (i)}<Skeleton clase="rounded-hoja {clase}" />{/each}
  </div>
</Pagina>
