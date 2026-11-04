<script lang="ts">
  import EsqueletoPagina from '$lib/shared/ui/EsqueletoPagina.svelte';
  import Pagina from '$lib/shared/ui/Pagina.svelte';
  import PageHeader from '$lib/shared/ui/PageHeader.svelte';
  import Tarjeta from '$lib/shared/ui/Tarjeta.svelte';
  import Metrica from '$lib/shared/ui/Metrica.svelte';
  import Icono from '$lib/shared/ui/Icono.svelte';
  import { ICONOS } from '$lib/shared/ui/iconos';
  import StatusPill from '$lib/shared/ui/StatusPill.svelte';
  import Empty from '$lib/shared/ui/Empty.svelte';
  import { misVentas } from '../api/ventas.api';
  import { mensajeError } from '$lib/shared/api/errores';
  import Dato from '$lib/shared/ui/Dato.svelte';
  import { pantallaCelular } from '$lib/shared/lib/pantalla';
  import { cop, fechaCorta } from '$lib/shared/lib/format';
  import type { VentaRow } from '../model/ventas';
  import { ventasPagadas, totalesVentas, filtrarVentas, type FiltroVentas } from '../model/ventas';

  const FILTROS: { valor: FiltroVentas; etiqueta: string }[] = [
    { valor: 'todas', etiqueta: 'Todas' },
    { valor: 'confirmadas', etiqueta: 'Pagadas' },
    { valor: 'pendientes', etiqueta: 'Pendientes de pago' },
  ];

  const celular = pantallaCelular();

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
  const totales = $derived(totalesVentas(ventasPagadas(ventas)));
</script>

{#if cargando}
  <EsqueletoPagina filas={5} clase="h-14" />
{:else if error}
  <Empty icono="sinConexion" titulo="Sin conexión" mensaje={error} />
{:else}
  <Pagina>
    <PageHeader titulo="Ventas y conciliación">
      {#snippet contexto()}
        Cada venta muestra la comisión de Diverso y el saldo que corresponde a tu agencia.
      {/snippet}
      {#snippet accion()}
        <div class="flex flex-wrap gap-2" role="group" aria-label="Filtrar ventas">
          {#each FILTROS as f}
            <button type="button" class="chip" aria-pressed={filtro === f.valor} onclick={() => (filtro = f.valor)}>
              {f.etiqueta}
            </button>
          {/each}
        </div>
      {/snippet}
    </PageHeader>

    <dl class="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
      <Metrica etiqueta="Ventas pagadas" valor={cop(totales.total)} tono="acento" />
      <Metrica etiqueta="Comisión ({comisionPct}%)" valor="- {cop(totales.comision)}" tono="alerta" />
      <Metrica etiqueta="Saldo a recibir" valor={cop(totales.saldo)} tono="ok" clase="col-span-2 sm:col-span-1" />
    </dl>

    {#if filtradas.length === 0}
      <Tarjeta sinRelleno clase="mt-6 overflow-hidden">
        <Empty
          icono="recibo"
          titulo="Sin ventas aquí"
          mensaje="Cuando los viajeros reserven tus planes, verás la conciliación en esta pantalla."
        />
      </Tarjeta>
    {:else if celular.current}
      <!-- Celular: una tarjeta por venta, con los mismos datos de la tabla -->
      <ul class="mt-6 space-y-3" aria-label="Ventas" data-lista-tarjetas>
        {#each filtradas as v (v.booking_id)}
          <li class="tarjeta p-4" data-venta={v.booking_id}>
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="cifra text-[20px] leading-tight break-words">{v.codigo}</p>
                <p class="mt-0.5 text-[15px] text-tinta-2">{v.plan_titulo}</p>
              </div>
              <StatusPill estado={v.booking_estado} />
            </div>
            <dl class="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-dashed border-linea pt-3">
              <Dato etiqueta="Fecha">{fechaCorta(v.fecha)}</Dato>
              <Dato etiqueta="Pax">{v.pax}</Dato>
              <Dato etiqueta="Monto">{cop(v.monto_total)}</Dato>
              <Dato etiqueta="Comisión" tono="alerta">- {cop(v.comision)}</Dato>
              <Dato etiqueta="Saldo" clase="col-span-2">
                <span class="text-[24px] font-bold">{cop(v.saldo_agencia)}</span>
              </Dato>
            </dl>
          </li>
        {/each}
      </ul>
    {:else}
      <Tarjeta sinRelleno clase="mt-6 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="tabla min-w-[880px]">
            <thead>
              <tr>
                <th>CÓDIGO</th>
                <th>PLAN</th>
                <th>FECHA</th>
                <th class="num">PAX</th>
                <th class="num">MONTO</th>
                <th class="num">COMISIÓN</th>
                <th class="num">SALDO</th>
                <th>ESTADO</th>
              </tr>
            </thead>
            <tbody>
              {#each filtradas as v (v.booking_id)}
                <tr>
                  <td class="fecha font-semibold whitespace-nowrap">{v.codigo}</td>
                  <td class="max-w-[360px] truncate text-tinta-2">{v.plan_titulo}</td>
                  <td class="fecha whitespace-nowrap">{fechaCorta(v.fecha)}</td>
                  <td class="num">{v.pax}</td>
                  <td class="num">{cop(v.monto_total)}</td>
                  <td class="num text-prueba-ink">- {cop(v.comision)}</td>
                  <td class="num font-bold">{cop(v.saldo_agencia)}</td>
                  <td><StatusPill estado={v.booking_estado} /></td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </Tarjeta>
    {/if}

    <p class="mt-5 flex items-start gap-2.5 text-[15px] leading-relaxed text-tinta-2">
      <Icono trazo={ICONOS.info} clase="mt-0.5 size-[18px] shrink-0" />
      <span>
        Modo de prueba (Wompi sandbox): los cobros a los viajeros son transacciones de prueba y no se mueve dinero
        real. Concilia estos saldos con tus
        <a class="enlace" href="#/liquidaciones">Liquidaciones</a>
        semanales y anticipos, que también son dispersiones de prueba.
      </span>
    </p>
  </Pagina>
{/if}
