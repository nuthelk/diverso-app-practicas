<script lang="ts">
  import Skeleton from '$lib/shared/ui/Skeleton.svelte';
  import Empty from '$lib/shared/ui/Empty.svelte';
  import StatusPill from '$lib/shared/ui/StatusPill.svelte';
  import LogoAgencia from '$lib/features/agencias/components/LogoAgencia.svelte';
  import { misVentas } from '$lib/features/ventas/api/ventas.api';
  import { misLiquidaciones, cuentasResumen } from '$lib/features/liquidaciones/api/liquidaciones.api';
  import { mensajeError } from '$lib/shared/api/errores';
  import type { Agency } from '$lib/features/agencias/model/agencia';
  import type { Plan } from '$lib/features/planes/model/plan';
  import type { VentaRow } from '$lib/features/ventas/model/ventas';
  import type { Liquidacion } from '$lib/features/liquidaciones/model/liquidaciones';
  import {
    SALIDAS_VISIBLES,
    avisosResumen,
    desdeResumen,
    estadoCabecera,
    fechaDeHoy,
    kpisResumen,
    proximasSalidasPorFecha,
    proximoPago,
    repartoMes,
    resumenDelMes,
    resumenMesAnterior,
    salidasPorDia,
  } from '../model/resumen';
  import AvisosResumen from '../components/AvisosResumen.svelte';
  import TarjetaKpi from '../components/TarjetaKpi.svelte';
  import LineaSalidas from '../components/LineaSalidas.svelte';
  import TarjetaMes from '../components/TarjetaMes.svelte';

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
      // Viajes desde el mes anterior o las últimas 8 semanas: cubre «Este mes», el mes anterior, las
      // series de los indicadores y las próximas salidas sin el tope de 200.
      const r = await misVentas({ desde: desdeResumen(hoy) });
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
  const grupos = $derived(salidasPorDia(salidas.slice(0, SALIDAS_VISIBLES), hoy));
  const mes = $derived(resumenDelMes(ventasLista, hoy));
  const anterior = $derived(resumenMesAnterior(ventasLista, hoy));
  const pago = $derived(liquidaciones ? proximoPago(liquidaciones, hoy) : null);
  const kpis = $derived(kpisResumen({ planes, salidas, ventas: ventasLista, liquidaciones, hoy }));
  const avisos = $derived(agencia ? avisosResumen({ agencia, planes, hayCuenta, hoy }) : []);
  const cabecera = $derived(agencia ? estadoCabecera(agencia, hoy) : null);
</script>

{#if cargando}
  <div class="px-4 pt-6 sm:px-6 lg:px-10 lg:pt-9">
    <div class="mx-auto max-w-[1096px] space-y-4">
      <Skeleton clase="h-14 w-80 max-w-full rounded-lg" />
      <div class="grid gap-4 sm:grid-cols-2 ancho:grid-cols-4">
        {#each [1, 2, 3, 4] as n (n)}<Skeleton clase="h-[124px] rounded-[18px]" />{/each}
      </div>
      <Skeleton clase="h-[320px] rounded-[18px]" />
    </div>
  </div>
{:else if error}
  <Empty icono="📡" titulo="Sin conexión" mensaje={error} />
{:else if !agencia}
  <Empty icono="🏢" titulo="Aún no tienes agencia" mensaje="Registra tu agencia para empezar." />
{:else}
  <div class="aparecer px-4 pt-6 pb-10 sm:px-6 lg:px-10 lg:pt-9">
    <div class="mx-auto max-w-[1096px]">
      <!-- Saludo y estado -->
      <header class="flex flex-wrap items-end gap-x-4 gap-y-3">
        <div class="min-w-0 flex-1 basis-[260px]">
          <h1 class="text-[24px] leading-[1.2] font-extrabold tracking-[-0.2px] sm:text-[26px]">Buen día, {agencia.nombre}</h1>
          <p class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13.5px] text-slate-600 dark:text-slate-400">
            <span>{fechaDeHoy(hoy)}</span>
            <span aria-hidden="true">·</span>
            {#if cabecera}
              <StatusPill estado={cabecera.estado} />
              {#if cabecera.detalle}<span>{cabecera.detalle}</span>{/if}
            {/if}
            <button
              type="button"
              class="rounded text-[12.5px] font-semibold text-acento-ink underline underline-offset-2"
              aria-expanded={logoAbierto}
              aria-controls="panel-logo"
              onclick={() => (logoAbierto = !logoAbierto)}
            >
              Cambiar logo
            </button>
          </p>
        </div>
        <a class="btn btn-primario shrink-0" href="#/planes/nuevo">
          <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Nuevo plan
        </a>
      </header>

      {#if logoAbierto}
        <div id="panel-logo" class="mt-4"><LogoAgencia {agencia} onactualizado={logoActualizado} /></div>
      {/if}

      {#if avisos.length > 0}
        <AvisosResumen {avisos} />
      {/if}

      <dl class="mt-5 grid gap-4 sm:grid-cols-2 ancho:grid-cols-4" aria-label="Indicadores del mes">
        {#each kpis as kpi (kpi.clave)}
          <TarjetaKpi {kpi} />
        {/each}
      </dl>

      <div class="mt-4 grid gap-4 lg:grid-cols-[1.55fr_1fr]">
        <LineaSalidas {grupos} />
        <TarjetaMes
          {mes}
          reparto={repartoMes(mes)}
          comisionPct={agencia.comision_pct}
          anterior={anterior.texto}
          {pago}
          pagoConsultado={liquidaciones !== null}
        />
      </div>
    </div>
  </div>
{/if}
