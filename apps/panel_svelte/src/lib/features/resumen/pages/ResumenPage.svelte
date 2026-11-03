<script lang="ts">
  import Skeleton from '$lib/shared/ui/Skeleton.svelte';
  import Empty from '$lib/shared/ui/Empty.svelte';
  import AvatarAgencia from '$lib/features/agencias/components/AvatarAgencia.svelte';
  import LogoAgencia from '$lib/features/agencias/components/LogoAgencia.svelte';
  import AvisoPrueba from '$lib/features/liquidaciones/components/AvisoPrueba.svelte';
  import { misVentas } from '$lib/features/ventas/api/ventas.api';
import { misLiquidaciones, cuentasResumen } from '$lib/features/liquidaciones/api/liquidaciones.api';
import { mensajeError } from '$lib/shared/api/errores';
  import { cop } from '$lib/shared/lib/format';
  import type { Agency } from '$lib/features/agencias/model/agencia';
import type { Plan } from '$lib/features/planes/model/plan';
import type { VentaRow } from '$lib/features/ventas/model/ventas';
  import type { Liquidacion } from '$lib/features/liquidaciones/model/liquidaciones';
  import {
    SALIDAS_VISIBLES,
    avisosResumen,
    etiquetaDia,
    plural,
    primerDiaDelMes,
    proximasSalidasPorFecha,
    proximoPago,
    resumenDelMes,
    textoDia,
    type NivelSalida,
  } from '../model/resumen';
  import { etiquetaEstadoAgencia } from '$lib/features/agencias/model/verificacion';
  import { goto } from '$app/navigation';

  const hoy = new Date();

  let cargando = $state(true);
  let error = $state('');
  let agencia = $state<Agency | null>(null);
  let planes = $state<Plan[]>([]);
  let ventasLista = $state<VentaRow[]>([]);
  /** null: no se pudieron consultar (el resto del Resumen no depende de ellos). */
  let liquidaciones = $state<Liquidacion[] | null>(null);
  let hayCuenta = $state<boolean | null>(null);
  let logoAbierto = $state(false);

  async function cargar() {
    cargando = true;
    error = '';
    try {
      // Viajes desde el 1.º del mes: cubre «Este mes» y las próximas salidas sin el tope de 200.
      const r = await misVentas({ desde: primerDiaDelMes() });
      agencia = r.agencia;
      planes = r.planes;
      ventasLista = r.ventas;
      if (r.agencia) {
        const id = r.agencia.id;
        const [liqs, cuentas] = await Promise.all([
          misLiquidaciones(id).catch(() => null),
          cuentasResumen().catch(() => null),
        ]);
        liquidaciones = liqs;
        hayCuenta = cuentas === null ? null : cuentas.some((c) => c.agency_id === id);
      }
    } catch (e) {
      error = mensajeError(e);
    } finally {
      cargando = false;
    }
  }

  function logoActualizado(logoUrl: string | null) {
    if (agencia) agencia = { ...agencia, logo_url: logoUrl };
  }

  // Carga al montar (initState): llamada directa, sin $effect.
  cargar();

  const salidas = $derived(proximasSalidasPorFecha(planes, ventasLista, hoy));
  const mes = $derived(resumenDelMes(ventasLista, hoy));
  const pago = $derived(liquidaciones ? proximoPago(liquidaciones, hoy) : null);
  const avisos = $derived(agencia ? avisosResumen({ agencia, planes, hayCuenta, hoy }) : []);
  const labelEstado = $derived(etiquetaEstadoAgencia(agencia, hoy));

  const TONOS = {
    info: 'bg-brand-600/10 text-brand-800 dark:text-brand-200',
    alerta: 'bg-orange-500/12 text-orange-800 dark:text-orange-300',
    error: 'bg-red-500/10 text-red-700 dark:text-red-300',
  } as const;

  /** Marca breve para las salidas que piden atención; las normales no llevan nada. */
  const MARCAS: Record<NivelSalida, { texto: string; clase: string } | null> = {
    llena: { texto: 'Llena', clase: 'bg-ok-500/12 text-ok-600 dark:text-ok-500' },
    casi_llena: { texto: 'Casi llena', clase: 'bg-orange-500/12 text-orange-700 dark:text-orange-300' },
    vacia: { texto: 'Sin reservas', clase: 'bg-slate-500/15 text-slate-600 dark:text-slate-300' },
    normal: null,
  };

  const TITULO_SECCION = 'text-[11.5px] font-bold tracking-[0.12em] text-slate-500 dark:text-slate-400';
  const ENLACE = 'text-[13px] font-semibold text-brand-600 hover:underline dark:text-brand-300';
</script>

{#if cargando}
  <div class="mx-auto max-w-[960px] space-y-4 px-4 py-6 sm:px-7">
    <Skeleton clase="h-14 w-80 max-w-full rounded-lg" />
    <Skeleton clase="h-[220px]" />
    <Skeleton clase="h-[150px]" />
  </div>
{:else if error}
  <Empty icono="📡" titulo="Sin conexión" mensaje={error} />
{:else if !agencia}
  <Empty icono="🏢" titulo="Aún no tienes agencia" mensaje="Registra tu agencia para empezar." />
{:else}
  <div class="aparecer mx-auto max-w-[960px] px-4 py-6 sm:px-7">
    <!-- Saludo y estado -->
    <header class="flex flex-wrap items-center gap-x-4 gap-y-3">
      <AvatarAgencia {agencia} tam={52} decorativo />
      <div class="min-w-[200px] flex-1">
        <h1 class="text-[24px] leading-tight font-extrabold tracking-tight sm:text-[26px]">Hola, {agencia.nombre}</h1>
        <p class="mt-0.5 text-[13.5px] text-slate-600 dark:text-slate-400">{labelEstado}</p>
        <button
          type="button"
          class="mt-1 rounded text-[12.5px] font-semibold text-brand-600 hover:underline dark:text-brand-300"
          aria-expanded={logoAbierto}
          aria-controls="panel-logo"
          onclick={() => (logoAbierto = !logoAbierto)}
        >
          Cambiar logo
        </button>
      </div>
      <button
        class="shrink-0 rounded-full bg-brand-600 px-5 py-2.5 text-[13.5px] font-bold text-white
          transition hover:bg-brand-500"
        onclick={() => goto('#/planes/nuevo')}
      >
        + Nuevo plan
      </button>
    </header>

    {#if logoAbierto}
      <div id="panel-logo" class="mt-4"><LogoAgencia {agencia} onactualizado={logoActualizado} /></div>
    {/if}

    <!-- Avisos: solo lo que la agencia puede resolver -->
    {#if avisos.length > 0}
      <section class="mt-5" aria-labelledby="avisos-titulo">
        <h2 id="avisos-titulo" class="text-[13.5px] font-bold">
          <span aria-hidden="true">⚠</span>
          {avisos.length}
          {plural(avisos.length, 'aviso', 'avisos')}
        </h2>
        <ul class="mt-2 space-y-2">
          {#each avisos as a (a.clave)}
            <li class="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl px-4 py-3 text-[13.5px] leading-snug {TONOS[a.tono]}">
              <span class="min-w-[200px] flex-1">{a.texto}</span>
              {#if a.accion}
                <a href={'#' + a.accion.ruta} class="shrink-0 font-bold underline underline-offset-2">{a.accion.texto}</a>
              {/if}
            </li>
          {/each}
        </ul>
      </section>
    {/if}

    <!-- Próximas salidas, en orden de fecha -->
    <section class="mt-8" aria-labelledby="salidas-titulo">
      <div class="flex items-baseline justify-between gap-3">
        <h2 id="salidas-titulo" class={TITULO_SECCION}>PRÓXIMAS SALIDAS</h2>
        <a href="#/planes" class={ENLACE}>Ver todas</a>
      </div>
      {#if salidas.length === 0}
        <div class="tarjeta mt-3 p-4 text-[13.5px] text-slate-600 dark:text-slate-400">
          No tienes salidas próximas. Agrega fechas en la sección Planes.
        </div>
      {:else}
        <ul class="mt-3 space-y-2.5">
          {#each salidas.slice(0, SALIDAS_VISIBLES) as s (s.fecha + s.titulo)}
            {@const marca = MARCAS[s.nivel]}
            <li data-salida class="tarjeta flex items-center gap-3 p-3.5 sm:gap-4">
              <time
                datetime={s.fecha}
                class="w-[5.5rem] shrink-0 text-[13.5px] font-extrabold text-brand-700 dark:text-brand-200"
                title={textoDia(s.fecha)}
              >{etiquetaDia(s.fecha, hoy)}</time
              >
              <div class="min-w-0 flex-1">
                <div class="truncate text-[14.5px] font-bold">{s.titulo}</div>
                <div class="mt-0.5 text-[12.5px] text-slate-600 dark:text-slate-400">
                  {s.personas}
                  {plural(s.personas, 'persona', 'personas')} · {s.libres}
                  {plural(s.libres, 'cupo libre', 'cupos libres')}
                </div>
              </div>
              {#if marca}
                <span class="shrink-0 rounded-full px-2.5 py-0.5 text-[11px] leading-5 font-bold whitespace-nowrap {marca.clase}"
                  >{marca.texto}</span
                >
              {/if}
            </li>
          {/each}
        </ul>
      {/if}
    </section>

    <!-- Este mes: la plata -->
    <section class="mt-8" aria-labelledby="mes-titulo">
      <div class="flex items-baseline justify-between gap-3">
        <h2 id="mes-titulo" class={TITULO_SECCION}>ESTE MES ({mes.mes})</h2>
        <a href="#/ventas" class={ENLACE}>Ver ventas</a>
      </div>
      <p class="mt-0.5 text-[12.5px] text-slate-600 dark:text-slate-400">
        Reservas pagadas de los viajes de {mes.mes}.
      </p>

      <div class="tarjeta mt-3 overflow-hidden">
        <dl class="grid divide-y divide-slate-200/80 sm:grid-cols-3 sm:divide-x sm:divide-y-0 dark:divide-ink-600">
          <div class="flex items-baseline justify-between gap-3 px-5 py-4 sm:block">
            <dt class="text-[13px] text-slate-600 dark:text-slate-400">Vendiste</dt>
            <dd class="text-[19px] font-extrabold tracking-tight tabular-nums sm:mt-1 sm:text-[22px]">{cop(mes.vendido)}</dd>
          </div>
          <div class="flex items-baseline justify-between gap-3 px-5 py-4 sm:block">
            <dt class="text-[13px] text-slate-600 dark:text-slate-400">Comisión {agencia.comision_pct}%</dt>
            <dd class="text-[19px] font-extrabold tracking-tight tabular-nums sm:mt-1 sm:text-[22px]">− {cop(mes.comision)}</dd>
          </div>
          <div class="flex items-baseline justify-between gap-3 px-5 py-4 sm:block">
            <dt class="text-[13px] font-semibold text-slate-700 dark:text-slate-300">Te corresponde</dt>
            <dd class="text-[19px] font-extrabold tracking-tight text-ok-600 tabular-nums sm:mt-1 sm:text-[22px] dark:text-ok-500">
              {cop(mes.aRecibir)}
            </dd>
          </div>
        </dl>
        <p class="border-t border-slate-200/80 px-5 py-3.5 text-[14px] dark:border-ink-600">
          <span class="font-bold">Próximo pago:</span>
          {#if liquidaciones === null}
            no pudimos consultarlo ahora.
          {:else if pago}
            {textoDia(pago.fecha)} · <strong class="font-extrabold tabular-nums">{cop(pago.monto)}</strong>
          {:else}
            no tienes pagos pendientes por ahora.
          {/if}
        </p>
      </div>
      <div class="mt-3"><AvisoPrueba /></div>
    </section>
  </div>
{/if}
