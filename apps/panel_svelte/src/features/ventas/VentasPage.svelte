<script lang="ts">
  import Skeleton from '@/shared/ui/Skeleton.svelte';
  import StatusPill from '@/shared/ui/StatusPill.svelte';
  import Empty from '@/shared/ui/Empty.svelte';
  import { misVentas } from './ventas.api';
import { mensajeError } from '@/shared/api/errores';
  import { cop, fechaCorta } from '@/shared/lib/format';
  import type { VentaRow } from './ventas';
  import { ventasPagadas, totalesVentas, filtrarVentas, type FiltroVentas } from './ventas';

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
  <div class="space-y-3 p-7">
    {#each Array(5) as _}<Skeleton clase="h-14 rounded-xl" />{/each}
  </div>
{:else if error}
  <Empty icono="📡" titulo="Sin conexión" mensaje={error} />
{:else}
  <div class="aparecer mx-auto max-w-[1200px] px-4 py-6 sm:px-7">
    <!-- Cabecera: título + filtro compacto -->
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-[24px] font-extrabold tracking-tight">Ventas y conciliación</h1>
        <p class="mt-1 text-[13px] text-slate-500 dark:text-slate-400">
          Cada venta muestra la comisión de Diverso y el saldo que corresponde a tu agencia.
        </p>
      </div>
      <div
        class="inline-flex overflow-hidden rounded-full border border-slate-200 text-[12.5px]
          font-semibold dark:border-ink-600"
      >
        {#each ['todas', 'confirmadas', 'pendientes'] as f, i}
          <button
            class="px-3.5 py-1.5 transition
              {filtro === f
              ? 'bg-brand-600 text-white'
              : i > 0
                ? 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-ink-700'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-ink-700'}"
            onclick={() => (filtro = f as typeof filtro)}
          >
            {f === 'todas' ? 'Todas' : f === 'confirmadas' ? 'Pagadas' : 'Pendientes de pago'}
          </button>
        {/each}
      </div>
    </div>

    <!-- Resumen -->
    <div class="mt-5 flex flex-wrap gap-3">
      <div class="rounded-2xl border border-slate-200/80 bg-white px-5 py-3 dark:border-ink-600 dark:bg-ink-800">
        <div class="text-[12px] text-slate-500 dark:text-slate-400">Ventas pagadas</div>
        <div class="mt-0.5 text-[17px] font-extrabold text-brand-700 tabular-nums dark:text-brand-200">
          {cop(totales.total)}
        </div>
      </div>
      <div class="rounded-2xl border border-slate-200/80 bg-white px-5 py-3 dark:border-ink-600 dark:bg-ink-800">
        <div class="text-[12px] text-slate-500 dark:text-slate-400">Comisión ({comisionPct}%)</div>
        <div class="mt-0.5 text-[17px] font-extrabold text-orange-600 tabular-nums">
          - {cop(totales.comision)}
        </div>
      </div>
      <div class="rounded-2xl border border-slate-200/80 bg-white px-5 py-3 dark:border-ink-600 dark:bg-ink-800">
        <div class="text-[12px] text-slate-500 dark:text-slate-400">Saldo a recibir</div>
        <div class="mt-0.5 text-[17px] font-extrabold text-ok-600 tabular-nums">
          {cop(totales.saldo)}
        </div>
      </div>
    </div>

    <!-- Tabla -->
    <div
      class="mt-6 overflow-hidden rounded-2xl border border-slate-200/80 bg-white
        dark:border-ink-600 dark:bg-ink-800"
    >
      {#if filtradas.length === 0}
        <Empty
          icono="🧾"
          titulo="Sin ventas aquí"
          mensaje="Cuando los viajeros reserven tus planes, verás la conciliación en esta pantalla."
        />
      {:else}
        <div class="overflow-x-auto">
          <table class="w-full min-w-[880px] text-[13px]">
            <thead>
              <tr class="bg-slate-500/8 text-left text-[11px] tracking-[0.08em] text-slate-500 dark:text-slate-400">
                <th class="px-4 py-2.5 font-bold">CÓDIGO</th>
                <th class="px-4 py-2.5 font-bold">PLAN</th>
                <th class="px-4 py-2.5 font-bold">FECHA</th>
                <th class="px-4 py-2.5 text-right font-bold">PAX</th>
                <th class="px-4 py-2.5 text-right font-bold">MONTO</th>
                <th class="px-4 py-2.5 text-right font-bold">COMISIÓN</th>
                <th class="px-4 py-2.5 text-right font-bold">SALDO</th>
                <th class="px-4 py-2.5 font-bold">ESTADO</th>
              </tr>
            </thead>
            <tbody>
              {#each filtradas as v (v.booking_id)}
                <tr class="border-t border-slate-200/70 transition hover:bg-slate-500/5 dark:border-ink-600">
                  <td class="px-4 py-3 font-semibold">{v.codigo}</td>
                  <td class="max-w-[260px] truncate px-4 py-3 text-slate-600 dark:text-slate-300">
                    {v.plan_titulo}
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap">{fechaCorta(v.fecha)}</td>
                  <td class="px-4 py-3 text-right tabular-nums">{v.pax}</td>
                  <td class="px-4 py-3 text-right tabular-nums">{cop(v.monto_total)}</td>
                  <td class="px-4 py-3 text-right text-orange-600 tabular-nums">
                    - {cop(v.comision)}
                  </td>
                  <td class="px-4 py-3 text-right font-extrabold tabular-nums">
                    {cop(v.saldo_agencia)}
                  </td>
                  <td class="px-4 py-3"><StatusPill estado={v.booking_estado} /></td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>

    <p class="mt-4 text-[12px] text-slate-400">
      ⓘ Modo de prueba (Wompi sandbox): los cobros a los viajeros son transacciones de prueba y no se
      mueve dinero real. Concilia estos saldos con tus
      <a class="font-semibold text-brand-600 hover:underline dark:text-brand-300" href="#/liquidaciones">Liquidaciones</a>
      semanales y anticipos, que también son dispersiones de prueba.
    </p>
  </div>
{/if}
