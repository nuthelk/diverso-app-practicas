<script lang="ts">
  import { cop, fechaCorta } from '$lib/shared/lib/format';
  import { etiquetaTipoItem, type LiquidacionItem } from '../liquidaciones';

  let { items }: { items: LiquidacionItem[] } = $props();
</script>

<div class="overflow-x-auto">
  <table class="w-full min-w-[720px] text-[13px]">
    <thead>
      <tr class="bg-slate-500/8 text-left text-[11px] tracking-[0.08em] text-slate-500 dark:text-slate-400">
        <th class="px-4 py-2.5 font-bold">RESERVA</th>
        <th class="px-4 py-2.5 font-bold">PLAN</th>
        <th class="px-4 py-2.5 font-bold">FECHA</th>
        <th class="px-4 py-2.5 font-bold">CONCEPTO</th>
        <th class="px-4 py-2.5 text-right font-bold">BRUTO</th>
        <th class="px-4 py-2.5 text-right font-bold">COMISIÓN</th>
        <th class="px-4 py-2.5 text-right font-bold">NETO</th>
      </tr>
    </thead>
    <tbody>
      {#each items as it (it.id)}
        <tr class="border-t border-slate-200/70 dark:border-ink-600">
          <td class="px-4 py-2.5 font-semibold">{it.bookings?.codigo ?? '—'}</td>
          <td class="max-w-[220px] truncate px-4 py-2.5 text-slate-600 dark:text-slate-300">
            {it.bookings?.plan_dates?.plans?.titulo ?? '—'}
          </td>
          <td class="px-4 py-2.5 whitespace-nowrap">
            {it.bookings?.plan_dates?.fecha ? fechaCorta(it.bookings.plan_dates.fecha) : '—'}
          </td>
          <td class="px-4 py-2.5 {it.tipo === 'ajuste' || it.monto_neto < 0 ? 'font-semibold text-red-600' : ''}">
            {etiquetaTipoItem(it.tipo)}
          </td>
          <td class="px-4 py-2.5 text-right tabular-nums">{cop(it.monto_bruto)}</td>
          <td class="px-4 py-2.5 text-right text-orange-600 tabular-nums">{cop(it.comision)}</td>
          <td class="px-4 py-2.5 text-right font-extrabold tabular-nums">{cop(it.monto_neto)}</td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
