<script lang="ts">
  import Skeleton from '../components/Skeleton.svelte';
  import StatusPill from '../components/StatusPill.svelte';
  import Empty from '../components/Empty.svelte';
  import AvisoPrueba from '../components/AvisoPrueba.svelte';
  import ItemsLiquidacion from '../components/ItemsLiquidacion.svelte';
  import { liquidacionDetalle, mensajeError } from '../api';
  import { cop } from '../format';
  import { etiquetaTipoLiquidacion, notaEstado, periodoTexto, type LiquidacionDetalle } from '../liquidaciones';

  let { id }: { id: string } = $props();

  let cargando = $state(true);
  let error = $state('');
  let liq = $state<LiquidacionDetalle | null>(null);

  $effect(() => {
    const actual = id;
    cargando = true;
    error = '';
    liquidacionDetalle(actual)
      .then((l) => (liq = l))
      .catch((e) => (error = mensajeError(e)))
      .finally(() => (cargando = false));
  });
</script>

{#if cargando}
  <div class="space-y-3 p-7">
    {#each Array(4) as _}<Skeleton clase="h-14 rounded-xl" />{/each}
  </div>
{:else if error}
  <Empty icono="📡" titulo="Sin conexión" mensaje={error} />
{:else if !liq}
  <Empty icono="🧾" titulo="No encontramos esta liquidación" mensaje="Puede que no sea de tu agencia o que ya no exista.">
    <a class="btn btn-secundario" href="#/liquidaciones">Volver a Liquidaciones</a>
  </Empty>
{:else}
  <div class="aparecer mx-auto max-w-[1100px] px-4 py-6 sm:px-7">
    <a class="text-[12.5px] font-semibold text-brand-600 hover:underline dark:text-brand-300" href="#/liquidaciones">
      ← Liquidaciones
    </a>
    <div class="mt-2 flex flex-wrap items-center gap-3">
      <h1 class="text-[24px] font-extrabold tracking-tight">
        Liquidación {etiquetaTipoLiquidacion(liq.tipo).toLowerCase()} · {periodoTexto(liq.periodo_inicio, liq.periodo_fin)}
      </h1>
      <StatusPill estado={liq.estado} />
    </div>
    {#if liq.referencia_prueba}
      <p class="mt-1 text-[12.5px] text-slate-500 dark:text-slate-400">
        Referencia: <strong>{liq.referencia_prueba}</strong>
      </p>
    {/if}

    <div class="mt-4"><AvisoPrueba /></div>

    {#if notaEstado(liq)}
      <p class="mt-3 rounded-xl bg-slate-500/8 px-4 py-2.5 text-[12.5px] text-slate-600 dark:text-slate-300" role="status">
        {notaEstado(liq)}
        {#if liq.compensada_en}
          <a class="font-semibold text-brand-600 hover:underline dark:text-brand-300" href={'#/liquidaciones/' + liq.compensada_en}>Ver la liquidación que la absorbió</a>
        {/if}
      </p>
    {/if}

    <dl class="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {#each [['Bruto', liq.monto_bruto], ['Comisión', liq.comision], ['Neto', liq.monto_neto], ['Anticipos descontados', liq.anticipos_descontados], ['A pagar', liq.monto_a_pagar]] as [etiqueta, valor]}
        <div class="rounded-2xl border border-slate-200/80 bg-white px-4 py-3 dark:border-ink-600 dark:bg-ink-800">
          <dt class="text-[12px] text-slate-500 dark:text-slate-400">{etiqueta}</dt>
          <dd class="mt-0.5 text-[16px] font-extrabold tabular-nums {etiqueta === 'A pagar' ? 'text-ok-600' : ''}">
            {cop(valor as number)}
          </dd>
        </div>
      {/each}
    </dl>

    <h2 class="mt-7 mb-2 text-[11.5px] font-bold tracking-[0.12em] text-slate-400">DETALLE POR RESERVA</h2>
    <div class="overflow-hidden rounded-2xl border border-slate-200/80 bg-white dark:border-ink-600 dark:bg-ink-800">
      {#if liq.liquidacion_items.length === 0}
        <Empty icono="🧾" titulo="Sin items" mensaje="Esta liquidación no tiene reservas asociadas." />
      {:else}
        <ItemsLiquidacion items={liq.liquidacion_items} />
      {/if}
    </div>
    <p class="mt-3 text-[12px] text-slate-400">
      Bruto − comisión = neto. A pagar = neto − anticipos descontados. La retención por cancelación es lo
      que no se reembolsó al viajero (menos la comisión). Los ajustes devuelven un anticipo que el
      reembolso dejó sin respaldo, y el saldo anterior absorbe una liquidación que quedó en cero o negativa.
    </p>
  </div>
{/if}
