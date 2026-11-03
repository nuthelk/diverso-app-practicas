<script lang="ts">
  import type { Kpi } from '../model/resumen';

  let { kpi }: { kpi: Kpi } = $props();
</script>

<div class="tarjeta grid min-h-[124px] grid-cols-[1fr_auto] grid-rows-[auto_1fr_auto] gap-x-2 px-5 py-[18px]" data-kpi={kpi.clave}>
  <dt class="col-span-full text-[12.5px] font-semibold text-slate-600 dark:text-slate-400">{kpi.titulo}</dt>
  <dd class="mt-2.5 self-end text-[24px] leading-[1.1] font-extrabold tracking-[-0.02em] whitespace-nowrap tabular-nums">
    {kpi.valor}
  </dd>
  {#if kpi.serie}
    <dd class="mb-[3px] self-end leading-[0]">
      <svg data-spark class="h-8 w-16 text-barra" viewBox="0 0 80 40" aria-hidden="true">
        <path d={kpi.serie.area} fill="currentColor" opacity="0.12" />
        <path d={kpi.serie.linea} fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        <circle cx={kpi.serie.x} cy={kpi.serie.y} r="2.6" fill="currentColor" />
      </svg>
    </dd>
  {:else if kpi.estrellas !== null}
    <dd class="mb-[3px] flex gap-0.5 self-end text-dorado" data-estrellas aria-hidden="true">
      {#each [1, 2, 3, 4, 5] as n}
        <svg
          class="size-[15px] {n > (kpi.estrellas ?? 0) ? 'text-pista' : ''}"
          data-vacia={n > (kpi.estrellas ?? 0) ? '' : undefined}
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z" />
        </svg>
      {/each}
    </dd>
  {/if}
  <dd class="col-span-full mt-2 text-[12px] text-slate-600 dark:text-slate-400">{kpi.nota}</dd>
</div>
