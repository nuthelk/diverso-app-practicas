<script lang="ts">
  import type { FiltroLiquidaciones } from '$lib/features/liquidaciones/model/liquidaciones';

  let {
    filtro,
    onelegir,
  }: { filtro: FiltroLiquidaciones; onelegir: (filtro: FiltroLiquidaciones) => void } = $props();

  const FILTROS: { valor: FiltroLiquidaciones; etiqueta: string }[] = [
    { valor: 'pendientes', etiqueta: 'Pendientes' },
    { valor: 'pagadas', etiqueta: 'Pagadas (prueba)' },
    { valor: 'todas', etiqueta: 'Todas' },
  ];
</script>

<div class="mt-8 flex flex-wrap items-center gap-2">
  <h2 class="mr-2 text-[18px] font-extrabold tracking-tight">Liquidaciones</h2>
  {#each FILTROS as f}
    <button
      class="chip"
      aria-pressed={filtro === f.valor}
      onclick={() => onelegir(f.valor)}
    >
      {f.etiqueta}
    </button>
  {/each}
</div>
