<script lang="ts">
  import type { FiltroAgencias } from '$lib/features/agencias/model/verificacion';

  let {
    filtro,
    conteos,
    busqueda = $bindable(),
    onelegir,
  }: {
    filtro: FiltroAgencias;
    conteos: Record<FiltroAgencias, number>;
    busqueda: string;
    onelegir: (filtro: FiltroAgencias) => void;
  } = $props();

  const FILTROS: { valor: FiltroAgencias; etiqueta: string }[] = [
    { valor: 'pendientes', etiqueta: 'Por verificar' },
    { valor: 'atencion', etiqueta: 'RNT por renovar' },
    { valor: 'verificadas', etiqueta: 'Verificadas' },
    { valor: 'rechazadas', etiqueta: 'Rechazadas' },
    { valor: 'todas', etiqueta: 'Todas' },
  ];
</script>

<div class="mt-6 flex flex-wrap items-center gap-2">
  {#each FILTROS as f}
    <button
      class="chip"
      aria-pressed={filtro === f.valor}
      onclick={() => onelegir(f.valor)}
    >
      {f.etiqueta}
      <span
        class="rounded-full px-1.5 text-[11px] tabular-nums
          {filtro === f.valor
          ? 'bg-white/20'
          : f.valor === 'atencion' && conteos.atencion > 0
            ? 'bg-orange-500/15 text-alert-ink'
            : 'bg-slate-500/12'}">{conteos[f.valor]}</span
      >
    </button>
  {/each}
  <div class="flex-1"></div>
  <input
    type="search"
    bind:value={busqueda}
    placeholder="Buscar por nombre, RNT o ciudad"
    class="campo w-full py-2 text-[13px] sm:w-[260px]"
    aria-label="Buscar agencias"
  />
</div>
