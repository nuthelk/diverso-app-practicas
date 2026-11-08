<script lang="ts">
  import StatusPill from '$lib/shared/ui/StatusPill.svelte';
  import ItemsLiquidacion from '$lib/features/liquidaciones/components/ItemsLiquidacion.svelte';
  import { cop } from '$lib/shared/lib/format';
  import {
    etiquetaTipoLiquidacion,
    notaEstado,
    periodoTexto,
    puedeEjecutarse,
    textoCuenta,
    type CuentaResumen,
    type Liquidacion,
    type LiquidacionItem,
  } from '$lib/features/liquidaciones/model/liquidaciones';

  let {
    liquidacion: l,
    cuenta,
    abierta,
    items,
    onejecutar,
    onitems,
  }: {
    liquidacion: Liquidacion;
    cuenta: CuentaResumen | undefined;
    abierta: boolean;
    items: LiquidacionItem[];
    /** Abre la confirmación; el backend solo se llama al confirmarla. */
    onejecutar: () => void;
    onitems: () => void;
  } = $props();
</script>

<li class="tarjeta overflow-hidden">
  <div class="flex flex-wrap items-center gap-3 px-5 pt-4 pb-3">
    <div class="min-w-0 flex-1">
      <h2 class="truncate text-destacado max-sm:break-words max-sm:whitespace-normal">{l.agencies?.nombre ?? 'Agencia'}</h2>
      <div class="text-detalle text-tinta-2">
        {etiquetaTipoLiquidacion(l.tipo)} · {periodoTexto(l.periodo_inicio, l.periodo_fin)}
      </div>
    </div>
    <div class="text-right">
      <div class="text-detalle font-bold text-tinta-2">A pagar</div>
      <div class="cifra text-seccion font-bold">{cop(l.monto_a_pagar)}</div>
    </div>
    <StatusPill estado={l.estado} />
  </div>

  <dl class="grid gap-x-6 gap-y-3 border-t border-linea px-5 py-4 sm:grid-cols-4">
    <div><dt class="text-detalle text-tinta-2">Bruto</dt><dd class="cifra text-destacado">{cop(l.monto_bruto)}</dd></div>
    <div><dt class="text-detalle text-tinta-2">Comisión</dt><dd class="cifra text-destacado">{cop(l.comision)}</dd></div>
    <div><dt class="text-detalle text-tinta-2">Anticipos descontados</dt><dd class="cifra text-destacado">{cop(l.anticipos_descontados)}</dd></div>
    <div>
      <dt class="text-detalle text-tinta-2">Cuenta</dt>
      <dd class="font-bold {cuenta ? '' : 'text-prueba-ink'}">{textoCuenta(cuenta)}</dd>
    </div>
  </dl>
  {#if l.referencia_prueba || notaEstado(l)}
    <div class="space-y-1 px-5 pb-4 text-detalle text-tinta-2">
      {#if l.referencia_prueba}<p>Referencia: <strong>{l.referencia_prueba}</strong></p>{/if}
      {#if notaEstado(l)}<p>{notaEstado(l)}</p>{/if}
    </div>
  {/if}

  <div class="flex flex-wrap items-center gap-2 border-t border-linea px-5 py-3">
    <button class="btn btn-texto -ml-3" aria-expanded={abierta} onclick={onitems}>
      {abierta ? 'Ocultar reservas' : 'Ver reservas'}
    </button>
    <div class="flex-1"></div>
    {#if puedeEjecutarse(l)}
      <button class="btn btn-primario" onclick={onejecutar}>Ejecutar dispersión de prueba</button>
    {/if}
  </div>

  {#if abierta}
    <div class="border-t border-linea">
      {#if items.length === 0}
        <p class="px-5 py-3 text-detalle text-tinta-2">Cargando reservas…</p>
      {:else}
        <ItemsLiquidacion {items} />
      {/if}
    </div>
  {/if}
</li>
