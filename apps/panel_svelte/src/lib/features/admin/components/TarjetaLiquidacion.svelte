<script lang="ts">
  import StatusPill from '$lib/shared/ui/StatusPill.svelte';
  import ItemsLiquidacion from '$lib/features/liquidaciones/components/ItemsLiquidacion.svelte';
  import { cop } from '$lib/shared/lib/format';
  import {
    AVISO_PRUEBA,
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
    confirmando,
    ejecutando,
    errorAccion,
    abierta,
    items,
    onconfirmar,
    oncancelar,
    onejecutar,
    onitems,
  }: {
    liquidacion: Liquidacion;
    cuenta: CuentaResumen | undefined;
    confirmando: boolean;
    ejecutando: boolean;
    errorAccion: string;
    abierta: boolean;
    items: LiquidacionItem[];
    onconfirmar: () => void;
    oncancelar: () => void;
    onejecutar: () => void;
    onitems: () => void;
  } = $props();
</script>

<li class="tarjeta p-5">
  <div class="flex flex-wrap items-center gap-3">
    <div class="min-w-0 flex-1">
      <div class="truncate text-[15px] font-extrabold">{l.agencies?.nombre ?? 'Agencia'}</div>
      <div class="text-[12px] text-slate-500 dark:text-slate-400">
        {etiquetaTipoLiquidacion(l.tipo)} · {periodoTexto(l.periodo_inicio, l.periodo_fin)}
      </div>
    </div>
    <div class="text-right">
      <div class="text-[11px] text-slate-400">A pagar</div>
      <div class="text-[17px] font-extrabold tabular-nums">{cop(l.monto_a_pagar)}</div>
    </div>
    <StatusPill estado={l.estado} />
  </div>

  <dl class="mt-3 grid gap-x-6 gap-y-1 text-[12.5px] sm:grid-cols-4">
    <div><dt class="text-slate-400">Bruto</dt><dd class="font-semibold tabular-nums">{cop(l.monto_bruto)}</dd></div>
    <div><dt class="text-slate-400">Comisión</dt><dd class="font-semibold tabular-nums">{cop(l.comision)}</dd></div>
    <div><dt class="text-slate-400">Anticipos descontados</dt><dd class="font-semibold tabular-nums">{cop(l.anticipos_descontados)}</dd></div>
    <div>
      <dt class="text-slate-400">Cuenta</dt>
      <dd class="font-semibold {cuenta ? '' : 'text-orange-700 dark:text-orange-300'}">{textoCuenta(cuenta)}</dd>
    </div>
  </dl>
  {#if l.referencia_prueba}
    <p class="mt-2 text-[12px] text-slate-500 dark:text-slate-400">Referencia: <strong>{l.referencia_prueba}</strong></p>
  {/if}
  {#if notaEstado(l)}
    <p class="mt-2 text-[12px] text-slate-500 dark:text-slate-400">{notaEstado(l)}</p>
  {/if}

  {#if confirmando}
    <div class="mt-4 rounded-xl border border-slate-200/80 bg-paper p-4 dark:border-ink-600 dark:bg-ink-900" role="alertdialog" aria-label="Confirmar dispersión de prueba">
      <p class="text-[13px]">
        Vas a registrar una <strong>dispersión de prueba</strong> de <strong>{cop(l.monto_a_pagar)}</strong>
        a <strong>{l.agencies?.nombre ?? 'la agencia'}</strong> ({textoCuenta(cuenta)}). {AVISO_PRUEBA}.
      </p>
      {#if errorAccion}<p class="mt-2 text-[12.5px] font-medium text-red-600" role="alert">{errorAccion}</p>{/if}
      <div class="mt-3 flex justify-end gap-2">
        <button class="btn btn-secundario py-1.5" onclick={oncancelar}>Cancelar</button>
        <button class="btn btn-primario py-1.5" disabled={ejecutando} onclick={onejecutar}>
          {ejecutando ? 'Registrando…' : 'Confirmar dispersión de prueba'}
        </button>
      </div>
    </div>
  {/if}

  <div class="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200/70 pt-3 dark:border-ink-600">
    <button
      class="text-[12.5px] font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
      aria-expanded={abierta}
      onclick={onitems}
    >
      {abierta ? 'Ocultar reservas' : 'Ver reservas'}
    </button>
    <div class="flex-1"></div>
    {#if puedeEjecutarse(l) && !confirmando}
      <button class="btn btn-primario py-1.5" onclick={onconfirmar}>Ejecutar dispersión de prueba</button>
    {/if}
  </div>

  {#if abierta}
    <div class="mt-3 overflow-hidden rounded-xl border border-slate-200/70 dark:border-ink-600">
      {#if items.length === 0}
        <p class="px-4 py-3 text-[12.5px] text-slate-400">Cargando reservas…</p>
      {:else}
        <ItemsLiquidacion {items} />
      {/if}
    </div>
  {/if}
</li>
