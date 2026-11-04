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

<li class="tarjeta overflow-hidden p-5">
  <div class="flex flex-wrap items-center gap-3">
    <div class="min-w-0 flex-1">
      <h2 class="truncate text-[21px] leading-tight max-sm:break-words max-sm:whitespace-normal">{l.agencies?.nombre ?? 'Agencia'}</h2>
      <div class="text-[15px] text-tinta-2">
        {etiquetaTipoLiquidacion(l.tipo)} · {periodoTexto(l.periodo_inicio, l.periodo_fin)}
      </div>
    </div>
    <div class="text-right">
      <div class="text-[14px] font-bold text-tinta-2">A pagar</div>
      <div class="cifra text-[26px] leading-tight font-bold">{cop(l.monto_a_pagar)}</div>
    </div>
    <StatusPill estado={l.estado} />
  </div>

  <dl class="mt-4 grid gap-x-6 gap-y-3 border-t border-dashed border-linea pt-4 text-[15px] sm:grid-cols-4">
    <div><dt class="text-tinta-2">Bruto</dt><dd class="cifra text-[18px]">{cop(l.monto_bruto)}</dd></div>
    <div><dt class="text-tinta-2">Comisión</dt><dd class="cifra text-[18px]">{cop(l.comision)}</dd></div>
    <div><dt class="text-tinta-2">Anticipos descontados</dt><dd class="cifra text-[18px]">{cop(l.anticipos_descontados)}</dd></div>
    <div>
      <dt class="text-tinta-2">Cuenta</dt>
      <dd class="font-bold {cuenta ? '' : 'text-prueba-ink'}">{textoCuenta(cuenta)}</dd>
    </div>
  </dl>
  {#if l.referencia_prueba}
    <p class="mt-3 text-[14px] text-tinta-2">Referencia: <strong>{l.referencia_prueba}</strong></p>
  {/if}
  {#if notaEstado(l)}
    <p class="mt-2 text-[14px] text-tinta-2">{notaEstado(l)}</p>
  {/if}

  {#if confirmando}
    <div class="mt-4 rounded-hoja-chica border border-linea bg-niebla p-4" role="alertdialog" aria-label="Confirmar dispersión de prueba">
      <p class="text-[15px]">
        Vas a registrar una <strong>dispersión de prueba</strong> de <strong>{cop(l.monto_a_pagar)}</strong>
        a <strong>{l.agencies?.nombre ?? 'la agencia'}</strong> ({textoCuenta(cuenta)}). {AVISO_PRUEBA}.
      </p>
      {#if errorAccion}<p class="mt-2 text-[15px] font-semibold text-heliconia" role="alert">{errorAccion}</p>{/if}
      <div class="mt-3 flex justify-end gap-2">
        <button class="btn btn-secundario " onclick={oncancelar}>Cancelar</button>
        <button class="btn btn-primario " disabled={ejecutando} onclick={onejecutar}>
          {ejecutando ? 'Registrando…' : 'Confirmar dispersión de prueba'}
        </button>
      </div>
    </div>
  {/if}

  <div class="mt-4 flex flex-wrap items-center gap-2 border-t border-dashed border-linea pt-3">
    <button
      class="btn btn-texto -ml-3"
      aria-expanded={abierta}
      onclick={onitems}
    >
      {abierta ? 'Ocultar reservas' : 'Ver reservas'}
    </button>
    <div class="flex-1"></div>
    {#if puedeEjecutarse(l) && !confirmando}
      <button class="btn btn-primario " onclick={onconfirmar}>Ejecutar dispersión de prueba</button>
    {/if}
  </div>

  {#if abierta}
    <div class="mt-3 overflow-hidden rounded-hoja-chica border border-linea">
      {#if items.length === 0}
        <p class="px-4 py-3 text-[15px] text-tinta-2">Cargando reservas…</p>
      {:else}
        <ItemsLiquidacion {items} />
      {/if}
    </div>
  {/if}
</li>
