<script lang="ts">
  import Tarjeta from '$lib/shared/ui/Tarjeta.svelte';
  import type { ResenaMostrada } from '../model/resenas';
  import ResenaItem from './ResenaItem.svelte';

  /** «Reseñas recientes»: las últimas tres, con el enlace a la página con todas. */
  let { resenas }: { resenas: ResenaMostrada[] | null } = $props();
</script>

<div data-resenas>
  <Tarjeta titulo="Reseñas recientes" descripcion="No dependen del período">
    {#snippet accion()}
      <a href="#/resenas" class="enlace -my-3 inline-flex min-h-11 items-center text-detalle" aria-label="Ver todas las reseñas">Ver todas</a>
    {/snippet}
    {#if resenas === null}
      <p class="text-tinta-2" data-sin-carga>No pudimos cargar las reseñas ahora.</p>
    {:else if resenas.length === 0}
      <p class="text-tinta-2" data-sin-resenas>Aún no tienes reseñas. Aparecerán aquí cuando tus viajeros las escriban.</p>
    {:else}
      <ul class="grid gap-3">
        {#each resenas as r, i (i)}
          <ResenaItem resena={r} />
        {/each}
      </ul>
    {/if}
  </Tarjeta>
</div>
