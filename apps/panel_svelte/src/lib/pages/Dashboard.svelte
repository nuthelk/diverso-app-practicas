<script lang="ts">
  import StatCard from '../components/StatCard.svelte';
  import Skeleton from '../components/Skeleton.svelte';
  import StatusPill from '../components/StatusPill.svelte';
  import Empty from '../components/Empty.svelte';
  import LogoAgencia from '../components/LogoAgencia.svelte';
  import { misVentas, mensajeError } from '../api';
  import { cop, fechaCorta, fechaLarga } from '../format';
  import type { Agency, Plan, VentaRow } from '../types';
  import { ventasPagadas, totalesVentas } from '../ventas';
  import { resumenOcupacion, proximasSalidas } from '../ocupacion';
  import { etiquetaEstadoAgencia } from '../agencias';
  import { go } from '../router.svelte';

  let cargando = $state(true);
  let error = $state('');
  let agencia = $state<Agency | null>(null);
  let planes = $state<Plan[]>([]);
  let ventasLista = $state<VentaRow[]>([]);

  async function cargar() {
    cargando = true;
    error = '';
    try {
      const r = await misVentas();
      agencia = r.agencia;
      planes = r.planes;
      ventasLista = r.ventas;
    } catch (e) {
      error = mensajeError(e);
    } finally {
      cargando = false;
    }
  }

  function logoActualizado(logoUrl: string | null) {
    if (agencia) agencia = { ...agencia, logo_url: logoUrl };
  }

  // Carga al montar (initState): llamada directa, sin $effect.
  cargar();

  // Ventas efectivas: reservas pagadas, ya sea por viajar (confirmada) o realizadas (completada).
  const confirmadas = $derived(ventasPagadas(ventasLista));
  const totales = $derived(totalesVentas(confirmadas));

  const resumen = $derived(resumenOcupacion(planes));
  const proximas = $derived(proximasSalidas(planes));
  const labelEstado = $derived(etiquetaEstadoAgencia(agencia));
</script>

{#if cargando}
  <div class="space-y-4 p-7">
    <Skeleton clase="h-8 w-72 rounded-lg" />
    <div class="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {#each Array(4) as _}<Skeleton clase="h-[124px]" />{/each}
    </div>
    <Skeleton clase="h-[200px]" />
    <Skeleton clase="h-24" />
  </div>
{:else if error}
  <Empty icono="📡" titulo="Sin conexión" mensaje={error} />
{:else if !agencia}
  <Empty icono="🏢" titulo="Aún no tienes agencia" mensaje="Registra tu agencia para empezar." />
{:else}
  <div class="aparecer mx-auto max-w-[1200px] px-4 py-6 sm:px-7">
    <!-- Cabecera -->
    <div class="flex flex-wrap items-start gap-4">
      <div class="min-w-[240px] flex-1">
        <h1 class="text-[24px] leading-tight font-extrabold tracking-tight sm:text-[26px]">Hola, {agencia.nombre}</h1>
        <p class="mt-1 text-[13.5px] text-slate-500 dark:text-slate-400">
          {labelEstado} · Comisión Diverso {agencia.comision_pct.toFixed(0)}%
        </p>
      </div>
      <button
        class="shrink-0 rounded-full bg-brand-600 px-5 py-2.5 text-[13.5px] font-bold text-white
          transition hover:bg-brand-500"
        onclick={() => go('/planes/nuevo')}
      >
        + Nuevo plan
      </button>
    </div>

    <!-- Logo -->
    <div class="mt-6"><LogoAgencia {agencia} onactualizado={logoActualizado} /></div>

    <!-- Métricas -->
    <div class="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
      <StatCard icono={'💵'} valor={cop(totales.total)} etiqueta="Ventas pagadas" />
      <StatCard icono={'📊'} valor={'- ' + cop(totales.comision)} etiqueta="Comisión Diverso" color="bg-orange-500/15 text-orange-600" />
      <StatCard icono={'🏦'} valor={cop(totales.saldo)} etiqueta="Tu saldo a recibir" color="bg-ok-500/15 text-ok-600" />
      <StatCard icono={'🎟️'} valor={String(confirmadas.length)} etiqueta="Reservas pagadas" />
    </div>

    <!-- Ocupación por salida -->
    <div class="mt-8 flex items-center justify-between">
      <div>
        <h2 class="text-[11.5px] font-bold tracking-[0.12em] text-slate-400">
          OCUPACIÓN POR SALIDA · DE LA MÁS LLENA A LA MÁS VACÍA
        </h2>
        <p class="mt-0.5 text-[12px] text-slate-400">
          {resumen.vendidos} de {resumen.total} cupos vendidos en las próximas 8
          semanas ({(resumen.ocup * 100).toFixed(0)}%)
        </p>
      </div>
      <a href="#/planes" class="text-[13px] font-semibold text-brand-600 hover:underline dark:text-brand-300"
        >Ver planes</a
      >
    </div>
    <div class="mt-3 space-y-2.5">
      {#if proximas.length === 0}
        <div
          class="rounded-2xl border border-slate-200/80 bg-white p-4 text-[13.5px] text-slate-500
            dark:border-ink-600 dark:bg-ink-800 dark:text-slate-400"
        >
          No tienes fechas futuras con cupos. Agrega fechas en la sección Planes.
        </div>
      {:else}
        {#each proximas as s (s.fecha + s.titulo)}
          {@const llena = s.ocup >= 0.66 || s.cupos <= 3}
          <div
            class="flex items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-white p-3.5
              transition hover:shadow-sm dark:border-ink-600 dark:bg-ink-800"
          >
            <div
              class="flex size-[50px] shrink-0 flex-col items-center justify-center rounded-[15px]
                leading-none
                {llena ? 'bg-orange-500/15 text-orange-600' : 'bg-brand-600/12 text-brand-700 dark:text-brand-200'}"
            >
              <span class="text-[17px] font-extrabold">{new Date(s.fecha + 'T12:00:00').getDate()}</span>
              <span class="mt-1 text-[9.5px] font-bold tracking-wider">
                {fechaCorta(s.fecha).split(' ').pop()?.toUpperCase()}
              </span>
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-baseline justify-between gap-3">
                <div class="truncate text-[14px] font-bold">{s.titulo}</div>
                <div class="shrink-0 text-[11.5px] font-bold tabular-nums {llena ? 'text-orange-600' : 'text-slate-400'}">
                  {(s.ocup * 100).toFixed(0)}% lleno
                </div>
              </div>
              <div class="mt-0.5 text-[12.5px] text-slate-500 dark:text-slate-400">
                {fechaLarga(s.fecha)} · {s.vendidos} vendidos · {s.cupos} libres
              </div>
              <div class="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200/70 dark:bg-ink-700">
                <div
                  class="h-full rounded-full {llena ? 'bg-orange-500' : 'bg-brand-600'}"
                  style="width:{Math.max(s.ocup * 100, 1.5).toFixed(1)}%"
                ></div>
              </div>
            </div>
          </div>
        {/each}
      {/if}
    </div>

    <!-- Últimas ventas -->
    <h2 class="mt-8 text-[11.5px] font-bold tracking-[0.12em] text-slate-400">ÚLTIMAS VENTAS</h2>
    <div class="mt-3 space-y-2.5">
      {#if ventasLista.length === 0}
        <div
          class="rounded-2xl border border-slate-200/80 bg-white p-4 text-[13.5px] text-slate-500
            dark:border-ink-600 dark:bg-ink-800 dark:text-slate-400"
        >
          Aún no tienes ventas registradas.
        </div>
      {:else}
        {#each ventasLista.slice(0, 6) as v (v.booking_id)}
          <div
            class="flex flex-wrap items-center gap-x-3.5 gap-y-2 rounded-2xl border border-slate-200/80 bg-white p-3.5
              dark:border-ink-600 dark:bg-ink-800"
          >
            <div class="min-w-[200px] flex-1">
              <div class="truncate text-[13.5px] font-bold">
                {v.codigo} · {v.plan_titulo}
              </div>
              <div class="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400">
                {fechaCorta(v.fecha)} · {v.pax} pax · saldo {cop(v.saldo_agencia)}
              </div>
            </div>
            <StatusPill estado={v.booking_estado} />
            <div class="w-24 text-right text-[14.5px] font-extrabold tabular-nums">
              {cop(v.monto_total)}
            </div>
          </div>
        {/each}
      {/if}
    </div>
  </div>
{/if}
