<script lang="ts">
  import TablaDatos, { type Columna } from '$lib/shared/ui/TablaDatos.svelte';
  import { cop, fechaCorta } from '$lib/shared/lib/format';
  import { etiquetaTipoItem, type LiquidacionItem } from '../model/liquidaciones';

  let { items }: { items: LiquidacionItem[] } = $props();

  const COLUMNAS: Columna[] = [
    { clave: 'reserva', titulo: 'Reserva', principal: true },
    { clave: 'plan', titulo: 'Plan' },
    { clave: 'fecha', titulo: 'Fecha' },
    { clave: 'concepto', titulo: 'Concepto' },
    { clave: 'bruto', titulo: 'Bruto', num: true },
    { clave: 'comision', titulo: 'Comisión', num: true },
    { clave: 'neto', titulo: 'Neto', num: true },
  ];

  /** Los ajustes y los netos negativos van en la tinta de urgencia. */
  const esAjuste = (it: LiquidacionItem) => it.tipo === 'ajuste' || it.monto_neto < 0;
</script>

<TablaDatos caption="Reservas de la liquidación" columnas={COLUMNAS} filas={items} clave={(it) => it.id}>
  {#snippet celda(it: LiquidacionItem, c: Columna)}
    {#if c.clave === 'reserva'}
      <span class="font-semibold whitespace-nowrap">{it.bookings?.codigo ?? '—'}</span>
    {:else if c.clave === 'plan'}
      <span class="block max-w-sm truncate text-tinta-2">{it.bookings?.plan_dates?.plans?.titulo ?? '—'}</span>
    {:else if c.clave === 'fecha'}
      <span class="whitespace-nowrap">{it.bookings?.plan_dates?.fecha ? fechaCorta(it.bookings.plan_dates.fecha) : '—'}</span>
    {:else if c.clave === 'concepto'}
      <span class={esAjuste(it) ? 'font-semibold text-heliconia' : ''}>{etiquetaTipoItem(it.tipo)}</span>
    {:else if c.clave === 'bruto'}
      {cop(it.monto_bruto)}
    {:else if c.clave === 'comision'}
      <span class="text-prueba-ink">{cop(it.comision)}</span>
    {:else}
      <span class="font-bold">{cop(it.monto_neto)}</span>
    {/if}
  {/snippet}
</TablaDatos>
