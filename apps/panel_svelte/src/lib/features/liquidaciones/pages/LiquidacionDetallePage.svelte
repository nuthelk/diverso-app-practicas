<script lang="ts">
  import EsqueletoPagina from '$lib/shared/ui/EsqueletoPagina.svelte';
  import Pagina from '$lib/shared/ui/Pagina.svelte';
  import PageHeader from '$lib/shared/ui/PageHeader.svelte';
  import Tarjeta from '$lib/shared/ui/Tarjeta.svelte';
  import FranjaMetricas from '$lib/shared/ui/FranjaMetricas.svelte';
  import Metrica from '$lib/shared/ui/Metrica.svelte';
  import StatusPill from '$lib/shared/ui/StatusPill.svelte';
  import Empty from '$lib/shared/ui/Empty.svelte';
  import ItemsLiquidacion from '../components/ItemsLiquidacion.svelte';
  import { liquidacionDetalle } from '../api/liquidaciones.api';
  import { mensajeError } from '$lib/shared/api/errores';
  import { cop } from '$lib/shared/lib/format';
  import {
    ayudaTipoItem,
    etiquetaTipoItem,
    etiquetaTipoLiquidacion,
    notaEstado,
    periodoTexto,
    type LiquidacionDetalle,
  } from '../model/liquidaciones';

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

  /** Los conceptos especiales que aparecen en esta liquidación, cada uno con su frase de ayuda. */
  const ayudas = $derived(
    liq
      ? [...new Set(liq.liquidacion_items.map((it) => it.tipo))].flatMap((tipo) => {
          const ayuda = ayudaTipoItem(tipo);
          return ayuda ? [{ tipo, ayuda }] : [];
        })
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

    {#if notaEstado(liq)}
      <p class="mt-4 rounded-hoja-chica bg-niebla-2 px-4 py-3 text-cuerpo text-tinta-2" role="status">
        {notaEstado(liq)}
        {#if liq.compensada_en}
          <a class="enlace" href={'#/liquidaciones/' + liq.compensada_en}>Ver la liquidación que la absorbió</a>
        {/if}
      </p>
    {/if}

    <div class="mt-6">
      <FranjaMetricas columnas={5}>
        <Metrica etiqueta="Bruto" valor={cop(liq.monto_bruto)} />
        <Metrica etiqueta="Comisión" valor={cop(liq.comision)} tono="alerta" />
        <Metrica etiqueta="Neto" valor={cop(liq.monto_neto)} sub="Bruto menos comisión" />
        <Metrica etiqueta="Anticipos ya entregados" valor={cop(liq.anticipos_descontados)} />
        <Metrica etiqueta="A pagar" valor={cop(liq.monto_a_pagar)} sub="Neto menos anticipos" principal />
      </FranjaMetricas>
    </div>

    <Tarjeta titulo="Detalle por reserva" sinRelleno clase="mt-6">
      {#if liq.liquidacion_items.length === 0}
        <Empty icono="recibo" titulo="Sin reservas" mensaje="Esta liquidación no tiene reservas asociadas." />
      {:else}
        <ItemsLiquidacion items={liq.liquidacion_items} />
      {/if}
    </Tarjeta>

    {#if ayudas.length > 0}
      <ul class="mt-4 max-w-[78ch] space-y-1 text-detalle text-tinta-2">
        {#each ayudas as { tipo, ayuda } (tipo)}
          <li><strong class="font-bold text-tinta">{etiquetaTipoItem(tipo)}:</strong> {ayuda}</li>
        {/each}
      </ul>
    {/if}
  </Pagina>
{/if}
