<script lang="ts">
  import { cop, fechaCorta } from '$lib/shared/lib/format';
  import { etiquetaTipoItem, type LiquidacionItem } from '../model/liquidaciones';

  let { items }: { items: LiquidacionItem[] } = $props();
</script>

<div class="overflow-x-auto">
  <table class="tabla min-w-[720px]">
    <thead>
      <tr>
        <th>RESERVA</th>
        <th>PLAN</th>
        <th>FECHA</th>
        <th>CONCEPTO</th>
        <th class="num">BRUTO</th>
        <th class="num">COMISIÓN</th>
        <th class="num">NETO</th>
      </tr>
    </thead>
    <tbody>
      {#each items as it (it.id)}
        <tr>
          <td class="font-semibold whitespace-nowrap">{it.bookings?.codigo ?? '—'}</td>
          <td class="max-w-[220px] truncate text-suave">{it.bookings?.plan_dates?.plans?.titulo ?? '—'}</td>
          <td class="whitespace-nowrap">
            {it.bookings?.plan_dates?.fecha ? fechaCorta(it.bookings.plan_dates.fecha) : '—'}
          </td>
          <td class={it.tipo === 'ajuste' || it.monto_neto < 0 ? 'font-semibold text-error-ink' : ''}>
            {etiquetaTipoItem(it.tipo)}
          </td>
          <td class="num">{cop(it.monto_bruto)}</td>
          <td class="num text-alert-ink">{cop(it.comision)}</td>
          <td class="num font-extrabold">{cop(it.monto_neto)}</td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
