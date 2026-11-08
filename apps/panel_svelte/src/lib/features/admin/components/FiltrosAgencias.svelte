<script lang="ts">
  import Chips from '$lib/shared/ui/Chips.svelte';
  import Campo from '$lib/shared/ui/Campo.svelte';
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

  const opciones = $derived(FILTROS.map((f) => ({ ...f, cantidad: conteos[f.valor] })));
</script>

<div class="mt-6 flex flex-wrap items-end gap-x-4 gap-y-3">
  <Chips etiqueta="Qué agencias ver" {opciones} valor={filtro} onchange={(v) => onelegir(v as FiltroAgencias)} />
  <Campo etiqueta="Buscar agencias" clase="w-full sm:ml-auto sm:w-72">
    {#snippet control(atributos)}
      <input {...atributos} type="search" bind:value={busqueda} placeholder="Nombre, RNT o ciudad" class="campo" />
    {/snippet}
  </Campo>
</div>
