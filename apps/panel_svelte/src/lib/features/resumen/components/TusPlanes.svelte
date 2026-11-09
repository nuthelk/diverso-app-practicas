<script lang="ts">
  import Tarjeta from '$lib/shared/ui/Tarjeta.svelte';
  import { plural } from '$lib/shared/lib/format';
  import type { PlanVendido } from '../model/tus-planes';

  /** «Tus planes»: cuántos viajeros tiene cada plan en las salidas del período y qué tan llenas van, con el enlace a Planes. */
  let { planes }: { planes: PlanVendido[] } = $props();
</script>

<div data-tus-planes>
  <Tarjeta titulo="Tus planes" descripcion="Viajeros por plan en el período">
    {#snippet accion()}
      <a href="#/planes" class="enlace -my-3 inline-flex min-h-11 items-center text-detalle" aria-label="Ver todos los planes">Ver todos</a>
    {/snippet}
    {#if planes.length === 0}
      <p class="text-detalle text-tinta-2" data-frase>Sin salidas en este período.</p>
    {:else}
      <ul class="grid gap-3.5">
        {#each planes as p (p.id)}
          <li data-plan={p.id}>
            <div class="flex justify-between gap-2 font-semibold">
              <span>{p.titulo}</span>
              <span class="cifra">{p.personas}</span>
            </div>
            <div
              class="my-1.5 h-2 overflow-hidden rounded-pildora border border-contorno bg-niebla-2"
              role="img"
              aria-label="{p.titulo}: {p.personas} {plural(p.personas, 'viajero', 'viajeros')} en el período"
            >
              <i class="block h-full bg-helecho" style:width="{p.ancho}%"></i>
            </div>
            <p class="text-detalle text-tinta-2">
              {p.salidas} {plural(p.salidas, 'salida', 'salidas')} · {p.ocupacion} % de los cupos
            </p>
          </li>
        {/each}
      </ul>
    {/if}
  </Tarjeta>
</div>
