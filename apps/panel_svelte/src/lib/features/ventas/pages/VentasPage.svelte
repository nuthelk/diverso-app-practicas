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
  import { cop, fechaCorta } from '$lib/shared/lib/format';
  import type { VentaRow } from '../model/ventas';
  import { ventasPagadas, totalesVentas, filtrarVentas, type FiltroVentas } from '../model/ventas';

  const FILTROS: { valor: FiltroVentas; etiqueta: string }[] = [
    { valor: 'todas', etiqueta: 'Todas' },
    { valor: 'confirmadas', etiqueta: 'Pagadas' },
    { valor: 'pendientes', etiqueta: 'Pendientes de pago' },
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

    <dl class="mt-5 grid gap-3 sm:grid-cols-3">
      <Metrica etiqueta="Ventas pagadas" valor={cop(totales.total)} tono="acento" />
      <Metrica etiqueta="Comisión ({comisionPct}%)" valor="- {cop(totales.comision)}" tono="alerta" />
      <Metrica etiqueta="Saldo a recibir" valor={cop(totales.saldo)} tono="ok" />
    </dl>

    <Tarjeta sinRelleno clase="mt-5 overflow-hidden">
      {#if filtradas.length === 0}
        <Empty
          icono="recibo"
          titulo="Sin ventas aquí"
          mensaje="Cuando los viajeros reserven tus planes, verás la conciliación en esta pantalla."
        />
      {:else}
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
                  <td class="font-semibold whitespace-nowrap">{v.codigo}</td>
                  <td class="max-w-[260px] truncate text-suave">{v.plan_titulo}</td>
                  <td class="whitespace-nowrap">{fechaCorta(v.fecha)}</td>
                  <td class="num">{v.pax}</td>
                  <td class="num">{cop(v.monto_total)}</td>
                  <td class="num text-alert-ink">- {cop(v.comision)}</td>
                  <td class="num font-extrabold">{cop(v.saldo_agencia)}</td>
                  <td><StatusPill estado={v.booking_estado} /></td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </Tarjeta>

    <p class="mt-4 flex items-start gap-2 text-[12px] leading-relaxed text-suave">
      <Icono trazo={ICONOS.info} clase="mt-px size-4" />
      <span>
        Modo de prueba (Wompi sandbox): los cobros a los viajeros son transacciones de prueba y no se mueve dinero
        real. Concilia estos saldos con tus
        <a class="enlace" href="#/liquidaciones">Liquidaciones</a>
        semanales y anticipos, que también son dispersiones de prueba.
      </span>
    </p>
  </Pagina>
{/if}
