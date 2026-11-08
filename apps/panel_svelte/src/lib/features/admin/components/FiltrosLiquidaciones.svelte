<script lang="ts">
  import Chips from '$lib/shared/ui/Chips.svelte';
  import type { FiltroLiquidaciones } from '$lib/features/liquidaciones/model/liquidaciones';

  let {
    filtro,
    conteos,
    onelegir,
  }: {
    filtro: FiltroLiquidaciones;
    conteos: Record<FiltroLiquidaciones, number>;
    onelegir: (filtro: FiltroLiquidaciones) => void;
  } = $props();

  const FILTROS: { valor: FiltroLiquidaciones; etiqueta: string }[] = [
    { valor: 'pendientes', etiqueta: 'Pendientes' },
    { valor: 'pagadas', etiqueta: 'Pagadas (prueba)' },
    { valor: 'todas', etiqueta: 'Todas' },
  ];

  const opciones = $derived(FILTROS.map((f) => ({ ...f, cantidad: conteos[f.valor] })));
</script>

<div class="mt-10 flex flex-wrap items-center gap-x-4 gap-y-2">
  <h2 class="text-seccion">Liquidaciones</h2>
  <Chips etiqueta="Qué liquidaciones ver" {opciones} valor={filtro} onchange={(v) => onelegir(v as FiltroLiquidaciones)} />
</div>
