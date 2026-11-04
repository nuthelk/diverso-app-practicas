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

<div class="mt-7 flex flex-wrap items-center gap-2">
  {#each FILTROS as f}
    <button
      class="chip"
      aria-pressed={filtro === f.valor}
      onclick={() => onelegir(f.valor)}
    >
      {f.etiqueta}
      <span
        class="cifra rounded-full px-2 text-[14px] leading-[22px]
          {filtro === f.valor
          ? 'bg-sobre-helecho text-helecho'
          : f.valor === 'atencion' && conteos.atencion > 0
            ? 'bg-prueba-bg text-prueba-ink'
            : 'bg-niebla-2 text-tinta-2'}">{conteos[f.valor]}</span
      >
    </button>
  {/each}
  <div class="flex-1"></div>
  <input
    type="search"
    bind:value={busqueda}
    placeholder="Buscar por nombre, RNT o ciudad"
    class="campo w-full sm:w-[300px]"
    aria-label="Buscar agencias"
  />
</div>
