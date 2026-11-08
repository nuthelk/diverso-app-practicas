<script lang="ts">
  import FranjaMetricas from '$lib/shared/ui/FranjaMetricas.svelte';
  import Metrica from '$lib/shared/ui/Metrica.svelte';
  import type { Kpi } from '../model/resumen';

  /**
   * Las cifras del período en una franja: cuatro cambian con el filtro de fecha y la quinta, el próximo pago, no depende
   * de él. `Metrica` no admite un enlace en su aclaración: la quinta lleva su propia celda, con el mismo formato.
   */
  let {
    kpis,
    pago,
  }: {
    kpis: Kpi[];
    pago: { etiqueta: string; valor: string; sub: string };
  } = $props();
</script>

<section aria-labelledby="h-cifras" data-cifras>
  <h2 id="h-cifras" class="sr-only">Cifras del período seleccionado</h2>
  <FranjaMetricas>
    {#each kpis as k (k.clave)}
      <Metrica etiqueta={k.etiqueta} valor={k.valor} sub={k.sub} tono={k.tono} principal={k.principal} />
    {/each}
    <div class="tarjeta px-4 py-4 sm:px-5">
      <dt class="text-detalle font-bold text-tinta-2">{pago.etiqueta}</dt>
      <dd class="mt-1">
        <span class="cifra block text-seccion font-bold [overflow-wrap:anywhere] sm:text-pagina">{pago.valor}</span>
        <span class="mt-0.5 block text-detalle text-tinta-2">{pago.sub} · <a class="enlace" href="#/liquidaciones">Ver liquidaciones</a></span>
      </dd>
    </div>
  </FranjaMetricas>
</section>
