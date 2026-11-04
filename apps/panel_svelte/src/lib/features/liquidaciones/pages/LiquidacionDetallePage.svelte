<script lang="ts">
  import EsqueletoPagina from '$lib/shared/ui/EsqueletoPagina.svelte';
  import Pagina from '$lib/shared/ui/Pagina.svelte';
  import PageHeader from '$lib/shared/ui/PageHeader.svelte';
  import Tarjeta from '$lib/shared/ui/Tarjeta.svelte';
  import Metrica from '$lib/shared/ui/Metrica.svelte';
  import StatusPill from '$lib/shared/ui/StatusPill.svelte';
  import Empty from '$lib/shared/ui/Empty.svelte';
  import AvisoPrueba from '../components/AvisoPrueba.svelte';
  import ItemsLiquidacion from '../components/ItemsLiquidacion.svelte';
  import { liquidacionDetalle } from '../api/liquidaciones.api';
  import { mensajeError } from '$lib/shared/api/errores';
  import { cop } from '$lib/shared/lib/format';
  import { etiquetaTipoLiquidacion, notaEstado, periodoTexto, type LiquidacionDetalle } from '../model/liquidaciones';

  let { id }: { id: string } = $props();

  let cargando = $state(true);
  let error = $state('');
  let liq = $state<LiquidacionDetalle | null>(null);

  $effect(() => {
    const actual = id;
    cargando = true;
    error = '';
    liquidacionDetalle(actual)
      .then((l) => (liq = l))
      .catch((e) => (error = mensajeError(e)))
      .finally(() => (cargando = false));
  });

  const metricas = $derived<[string, number][]>(
    liq
      ? [
          ['Bruto', liq.monto_bruto],
          ['Comisión', liq.comision],
          ['Neto', liq.monto_neto],
          ['Anticipos descontados', liq.anticipos_descontados],
          ['A pagar', liq.monto_a_pagar],
        ]
      : [],
  );
</script>

{#if cargando}
  <EsqueletoPagina filas={4} clase="h-14" />
{:else if error}
  <Empty icono="sinConexion" titulo="Sin conexión" mensaje={error} />
{:else if !liq}
  <Empty icono="recibo" titulo="No encontramos esta liquidación" mensaje="Puede que no sea de tu agencia o que ya no exista.">
    <a class="btn btn-secundario" href="#/liquidaciones">Volver a Liquidaciones</a>
  </Empty>
{:else}
  <Pagina>
    <PageHeader
      titulo="Liquidación {etiquetaTipoLiquidacion(liq.tipo).toLowerCase()} · {periodoTexto(liq.periodo_inicio, liq.periodo_fin)}"
      atras={{ href: '#/liquidaciones', texto: 'Liquidaciones' }}
    >
      {#snippet junto()}<StatusPill estado={liq!.estado} />{/snippet}
      {#snippet contexto()}
        {#if liq!.referencia_prueba}Referencia: <strong class="text-tinta">{liq!.referencia_prueba}</strong>{/if}
      {/snippet}
    </PageHeader>

    <div class="mt-4"><AvisoPrueba /></div>

    {#if notaEstado(liq)}
      <p class="mt-3 rounded-hoja-chica bg-niebla-2 px-4 py-3 text-[15px] text-tinta-2" role="status">
        {notaEstado(liq)}
        {#if liq.compensada_en}
          <a class="enlace" href={'#/liquidaciones/' + liq.compensada_en}>Ver la liquidación que la absorbió</a>
        {/if}
      </p>
    {/if}

    <dl class="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {#each metricas as [etiqueta, valor]}
        <Metrica {etiqueta} valor={cop(valor)} tono={etiqueta === 'A pagar' ? 'ok' : 'neutro'} clase={etiqueta === 'A pagar' ? 'col-span-2 sm:col-span-1' : ''} />
      {/each}
    </dl>

    <h2 class="etiqueta-seccion mt-8 mb-2.5">DETALLE POR RESERVA</h2>
    <Tarjeta sinRelleno clase="overflow-hidden">
      {#if liq.liquidacion_items.length === 0}
        <Empty icono="recibo" titulo="Sin items" mensaje="Esta liquidación no tiene reservas asociadas." />
      {:else}
        <ItemsLiquidacion items={liq.liquidacion_items} />
      {/if}
    </Tarjeta>
    <p class="mt-4 max-w-[78ch] text-[14.5px] leading-relaxed text-tinta-2">
      Bruto − comisión = neto. A pagar = neto − anticipos descontados. La retención por cancelación es lo
      que no se reembolsó al viajero (menos la comisión). Los ajustes devuelven un anticipo que el
      reembolso dejó sin respaldo, y el saldo anterior absorbe una liquidación que quedó en cero o negativa.
    </p>
  </Pagina>
{/if}
