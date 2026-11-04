<script lang="ts">
  import { plural } from '$lib/shared/lib/format';
  import type { TusPlanes } from '../model/tus-planes';

  /** «Tus planes»: cuánta gente tiene cada plan este mes y qué tan llenas van sus salidas; sin gráficos de adorno. */
  let { datos }: { datos: TusPlanes } = $props();
</script>

<section aria-labelledby="h-planes" data-tus-planes>
  <h2 id="h-planes" class="titulo-seccion">Tus planes</h2>
  <p class="mt-1.5 text-tinta-2" data-frase>{datos.frase}</p>
  {#if datos.planes.length > 0}
    <ul class="mt-4 grid gap-[18px]">
      {#each datos.planes as p (p.id)}
        <li data-plan={p.id}>
          <div class="flex items-center justify-between gap-2.5">
            <h3 class="text-[18px] leading-[1.25]">{p.titulo}</h3>
            {#if p.etiqueta === 'mas'}
              <span class="rounded-full bg-helecho px-3 py-0.5 text-[13px] font-extrabold whitespace-nowrap text-sobre-helecho">Vende más</span>
            {:else if p.etiqueta === 'menos'}
              <span class="rounded-full border-[1.5px] border-contorno px-3 py-0.5 text-[13px] font-extrabold whitespace-nowrap text-tinta">Vende menos</span>
            {/if}
          </div>
          <div
            class="relative mt-2 mb-1.5 flex h-[22px] items-center overflow-hidden rounded-[4px_13px_4px_13px] border border-linea bg-niebla-2"
            role="img"
            aria-label="{p.titulo}: {p.personas} {plural(p.personas, 'persona', 'personas')} este mes"
          >
            <i
              class="absolute inset-y-0 left-0 rounded-r-[13px] {p.etiqueta === 'menos' ? 'bg-musgo' : 'bg-helecho'}"
              style:width="{p.ancho}%"
            ></i>
          </div>
          <p class="font-titulo text-[16px] text-tinta-2">
            {#if p.salidas === 0}
              Sin salidas este mes
            {:else}
              <b class="text-tinta">{p.personas} {plural(p.personas, 'persona', 'personas')}</b> en {p.salidas}
              {plural(p.salidas, 'salida', 'salidas')} · {p.ocupacion} % de los cupos ocupados
            {/if}
          </p>
        </li>
      {/each}
    </ul>
  {/if}
</section>
