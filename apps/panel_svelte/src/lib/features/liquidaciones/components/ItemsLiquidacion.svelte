<script lang="ts">
  import Dato from '$lib/shared/ui/Dato.svelte';
  import { pantallaCelular } from '$lib/shared/lib/pantalla';
  import { cop, fechaCorta } from '$lib/shared/lib/format';
  import { etiquetaTipoItem, type LiquidacionItem } from '../model/liquidaciones';

  let { items }: { items: LiquidacionItem[] } = $props();

  const celular = pantallaCelular();

  /** Los ajustes y los netos negativos van en la tinta de urgencia. */
  const esAjuste = (it: LiquidacionItem) => it.tipo === 'ajuste' || it.monto_neto < 0;
</script>

{#if celular.current}
  <!-- Celular: una tarjeta por reserva, con los mismos datos de la tabla -->
  <ul class="divide-y divide-linea" aria-label="Reservas de la liquidación" data-lista-tarjetas>
    {#each items as it (it.id)}
      <li class="p-4" data-item={it.id}>
        <p class="cifra text-[19px] leading-tight break-words">{it.bookings?.codigo ?? '—'}</p>
        <p class="mt-0.5 text-[15px] text-tinta-2">{it.bookings?.plan_dates?.plans?.titulo ?? '—'}</p>
        <p class="mt-1 text-[15px] {esAjuste(it) ? 'font-bold text-heliconia' : ''}">
          <span class="cifra">{it.bookings?.plan_dates?.fecha ? fechaCorta(it.bookings.plan_dates.fecha) : '—'}</span>
          · {etiquetaTipoItem(it.tipo)}
        </p>
        <dl class="mt-3 grid grid-cols-3 gap-x-3 gap-y-3 border-t border-dashed border-linea pt-3">
          <Dato etiqueta="Bruto">{cop(it.monto_bruto)}</Dato>
          <Dato etiqueta="Comisión" tono="alerta">{cop(it.comision)}</Dato>
          <Dato etiqueta="Neto"><span class="font-bold">{cop(it.monto_neto)}</span></Dato>
        </dl>
      </li>
    {/each}
  </ul>
{:else}
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
            <td class="fecha font-semibold whitespace-nowrap">{it.bookings?.codigo ?? '—'}</td>
            <td class="max-w-[360px] truncate text-tinta-2">{it.bookings?.plan_dates?.plans?.titulo ?? '—'}</td>
            <td class="fecha whitespace-nowrap">
              {it.bookings?.plan_dates?.fecha ? fechaCorta(it.bookings.plan_dates.fecha) : '—'}
            </td>
            <td class={esAjuste(it) ? 'font-semibold text-heliconia' : ''}>
              {etiquetaTipoItem(it.tipo)}
            </td>
            <td class="num">{cop(it.monto_bruto)}</td>
            <td class="num text-prueba-ink">{cop(it.comision)}</td>
            <td class="num font-bold">{cop(it.monto_neto)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}
