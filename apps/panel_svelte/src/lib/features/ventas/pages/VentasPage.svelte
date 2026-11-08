<script lang="ts">
  import EsqueletoPagina from '$lib/shared/ui/EsqueletoPagina.svelte';
  import Pagina from '$lib/shared/ui/Pagina.svelte';
  import PageHeader from '$lib/shared/ui/PageHeader.svelte';
  import Tarjeta from '$lib/shared/ui/Tarjeta.svelte';
  import FranjaMetricas from '$lib/shared/ui/FranjaMetricas.svelte';
  import Metrica from '$lib/shared/ui/Metrica.svelte';
  import Chips from '$lib/shared/ui/Chips.svelte';
  import TablaDatos, { type Columna } from '$lib/shared/ui/TablaDatos.svelte';
  import StatusPill from '$lib/shared/ui/StatusPill.svelte';
  import Empty from '$lib/shared/ui/Empty.svelte';
  import { misVentas } from '../api/ventas.api';
  import { mensajeError } from '$lib/shared/api/errores';
  import { cop, fechaCorta, plural } from '$lib/shared/lib/format';
  import type { VentaRow } from '../model/ventas';
  import { ventasPagadas, totalesVentas, filtrarVentas, type FiltroVentas } from '../model/ventas';

  const FILTROS: { valor: FiltroVentas; etiqueta: string; ninguna: string }[] = [
    { valor: 'todas', etiqueta: 'Todas', ninguna: 'Sin ventas aquí' },
    { valor: 'confirmadas', etiqueta: 'Pagadas', ninguna: 'Ninguna venta pagada' },
    { valor: 'pendientes', etiqueta: 'Pendientes de pago', ninguna: 'Ninguna venta pendiente de pago' },
  ];

  const COLUMNAS: Columna[] = [
    { clave: 'codigo', titulo: 'Código', principal: true },
    { clave: 'plan_titulo', titulo: 'Plan' },
    { clave: 'fecha', titulo: 'Fecha' },
    { clave: 'pax', titulo: 'Viajeros', num: true },
    { clave: 'monto_total', titulo: 'Monto', num: true },
    { clave: 'comision', titulo: 'Comisión', num: true },
    { clave: 'saldo_agencia', titulo: 'Saldo', num: true },
    { clave: 'booking_estado', titulo: 'Estado' },
  ];

  let cargando = $state(true);
  let error = $state('');
  let ventas = $state<VentaRow[]>([]);
  let comisionPct = $state(12);
  let filtro = $state<FiltroVentas>('todas');

  async function cargar() {
    cargando = true;
    error = '';
    try {
      const r = await misVentas();
      ventas = r.ventas;
      comisionPct = r.agencia?.comision_pct ?? 12;
    } catch (e) {
      error = mensajeError(e);
    } finally {
      cargando = false;
    }
  }

  $effect(() => {
    cargar();
  });

  const filtradas = $derived(filtrarVentas(ventas, filtro));
  const pagadas = $derived(ventasPagadas(ventas));
  const totales = $derived(totalesVentas(pagadas));
  const opciones = $derived(
    FILTROS.map((f) => ({ valor: f.valor, etiqueta: f.etiqueta, cantidad: filtrarVentas(ventas, f.valor).length })),
  );
  const ninguna = $derived(FILTROS.find((f) => f.valor === filtro)!.ninguna);
</script>

{#if cargando}
  <EsqueletoPagina filas={5} clase="h-14" />
{:else if error}
  <Empty icono="sinConexion" titulo="Sin conexión" mensaje={error} />
{:else}
  <Pagina>
    <PageHeader titulo="Ventas">
      {#snippet contexto()}
        Cada venta con la comisión de Diverso y el saldo que le toca a tu agencia. Compara esos saldos con tus
        <a class="enlace" href="#/liquidaciones">Liquidaciones</a>.
      {/snippet}
    </PageHeader>

    <div class="mt-6">
      <FranjaMetricas columnas={3}>
        <Metrica
          etiqueta="Ventas pagadas"
          valor={cop(totales.total)}
          sub="{pagadas.length} {plural(pagadas.length, 'reserva', 'reservas')}"
        />
        <Metrica etiqueta="Comisión ({comisionPct}%)" valor="- {cop(totales.comision)}" tono="alerta" />
        <Metrica etiqueta="Saldo a recibir" valor={cop(totales.saldo)} principal />
      </FranjaMetricas>
    </div>

    <Tarjeta etiqueta="Detalle de ventas" sinRelleno clase="mt-6 overflow-hidden">
      <div class="flex flex-wrap items-end justify-between gap-x-4 gap-y-3 px-5 pt-4 pb-3">
        <div>
          <h2 class="text-seccion">Detalle por reserva</h2>
          <p class="text-detalle text-tinta-2">Las cifras de arriba cuentan solo las ventas pagadas.</p>
        </div>
        <Chips etiqueta="Filtrar ventas" {opciones} valor={filtro} onchange={(v) => (filtro = v as FiltroVentas)} />
      </div>

      <TablaDatos caption="Ventas, una fila por reserva" columnas={COLUMNAS} filas={filtradas} clave={(v) => v.booking_id}>
        {#snippet celda(v: VentaRow, c: Columna)}
          {#if c.clave === 'codigo'}
            <span class="font-semibold whitespace-nowrap">{v.codigo}</span>
          {:else if c.clave === 'plan_titulo'}
            <span class="block max-w-sm truncate text-tinta-2">{v.plan_titulo}</span>
          {:else if c.clave === 'fecha'}
            <span class="whitespace-nowrap">{fechaCorta(v.fecha)}</span>
          {:else if c.clave === 'pax'}
            {v.pax}
          {:else if c.clave === 'monto_total'}
            {cop(v.monto_total)}
          {:else if c.clave === 'comision'}
            <span class="text-prueba-ink">- {cop(v.comision)}</span>
          {:else if c.clave === 'saldo_agencia'}
            <span class="font-bold">{cop(v.saldo_agencia)}</span>
          {:else}
            <StatusPill estado={v.booking_estado} />
          {/if}
        {/snippet}
        {#snippet vacio()}
          {#if ventas.length === 0}
            <Empty icono="recibo" titulo={ninguna} mensaje="Cuando los viajeros reserven tus planes, verás aquí cada venta." />
          {:else}
            <Empty icono="recibo" titulo={ninguna} mensaje="Ninguna reserva cumple este filtro.">
              <button type="button" class="btn btn-secundario" onclick={() => (filtro = 'todas')}>Ver todas</button>
            </Empty>
          {/if}
        {/snippet}
      </TablaDatos>
    </Tarjeta>
  </Pagina>
{/if}
