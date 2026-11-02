<script lang="ts">
  import type { FiltroLiquidaciones } from '@/features/liquidaciones/liquidaciones';

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
      class="rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition
        {filtro === f.valor
        ? 'border-brand-600 bg-brand-600 text-white'
        : 'border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-ink-600 dark:text-slate-300 dark:hover:bg-ink-700'}"
      aria-pressed={filtro === f.valor}
      onclick={() => onelegir(f.valor)}
    >
      {f.etiqueta}
    </button>
  {/each}
</div>
