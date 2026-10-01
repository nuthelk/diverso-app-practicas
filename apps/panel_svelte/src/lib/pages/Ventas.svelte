<script lang="ts">
  import Skeleton from '../components/Skeleton.svelte';
  import StatusPill from '../components/StatusPill.svelte';
  import Empty from '../components/Empty.svelte';
  import { misVentas, mensajeError } from '../api';
  import { cop, fechaCorta } from '../format';
  import type { VentaRow } from '../types';

  let cargando = $state(true);
  let error = $state('');
  let ventas = $state<VentaRow[]>([]);
  let comisionPct = $state(12);
  let filtro = $state<'todas' | 'confirmadas' | 'pendientes'>('todas');

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

  const confirmadas = $derived(ventas.filter((v) => v.booking_estado === 'confirmada'));
  const filtradas = $derived(
    filtro === 'confirmadas'
      ? confirmadas
      : filtro === 'pendientes'
        ? ventas.filter((v) => v.booking_estado === 'pendiente_pago')
        : ventas,
  );
  const totalComision = $derived(confirmadas.reduce((s, v) => s + v.comision, 0));
  const saldoTotal = $derived(confirmadas.reduce((s, v) => s + v.saldo_agencia, 0));
</script>

{#if cargando}
  <div class="space-y-3 p-7">
    {#each Array(5) as _}<Skeleton clase="h-14 rounded-xl" />{/each}
  </div>
{:else if error}
  <Empty icono="📡" titulo="Sin conexión" mensaje={error} />
{:else}
  <div class="aparecer mx-auto max-w-[1200px] px-7 py-6">
    <!-- Cabecera: título + filtro compacto -->
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-[24px] font-extrabold tracking-tight">Ventas y conciliación</h1>
        <p class="mt-1 text-[13px] text-slate-500 dark:text-slate-400">
          El motor retiene la comisión de Diverso y dispersa el saldo a tu cuenta sin intervención
          manual.
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
            {f === 'todas' ? 'Todas' : f === 'confirmadas' ? 'Confirmadas' : 'Pendientes'}
          </button>
        {/each}
      </div>
    </div>

    <!-- Resumen -->
    <div class="mt-5 flex flex-wrap gap-3">
      <div class="rounded-2xl border border-slate-200/80 bg-white px-5 py-3 dark:border-ink-600 dark:bg-ink-800">
        <div class="text-[12px] text-slate-500 dark:text-slate-400">Ventas confirmadas</div>
        <div class="mt-0.5 text-[17px] font-extrabold text-brand-700 tabular-nums dark:text-brand-200">
          {cop(confirmadas.reduce((s, v) => s + v.monto_total, 0))}
        </div>
      </div>
      <div class="rounded-2xl border border-slate-200/80 bg-white px-5 py-3 dark:border-ink-600 dark:bg-ink-800">
        <div class="text-[12px] text-slate-500 dark:text-slate-400">Comisión ({comisionPct}%)</div>
        <div class="mt-0.5 text-[17px] font-extrabold text-orange-600 tabular-nums">
          - {cop(totalComision)}
        </div>
      </div>
      <div class="rounded-2xl border border-slate-200/80 bg-white px-5 py-3 dark:border-ink-600 dark:bg-ink-800">
        <div class="text-[12px] text-slate-500 dark:text-slate-400">Saldo a recibir</div>
        <div class="mt-0.5 text-[17px] font-extrabold text-ok-600 tabular-nums">
          {cop(saldoTotal)}
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

    <p class="mt-4 flex items-start gap-1.5 text-[12px] text-slate-400">
      ⓘ Pagos simulados en el MVP. Con la pasarela real (Wompi/PayU), la dispersión del saldo será
      automática.
    </p>
  </div>
{/if}
