<script lang="ts">
  import Skeleton from '$lib/shared/ui/Skeleton.svelte';
  import Pagina from '$lib/shared/ui/Pagina.svelte';
  import PageHeader from '$lib/shared/ui/PageHeader.svelte';
  import Icono from '$lib/shared/ui/Icono.svelte';
  import { ICONOS } from '$lib/shared/ui/iconos';
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
  <Pagina>
    <div class="space-y-4" role="status" aria-label="Cargando">
      <Skeleton clase="h-14 w-80 max-w-full rounded-lg" />
      <div class="grid gap-4 sm:grid-cols-2 ancho:grid-cols-4">
        {#each [1, 2, 3, 4] as n (n)}<Skeleton clase="h-[124px]" />{/each}
      </div>
      <Skeleton clase="h-[320px]" />
    </div>
  </Pagina>
{:else if error}
  <Empty icono="sinConexion" titulo="Sin conexión" mensaje={error} />
{:else if !agencia}
  <Empty icono="edificio" titulo="Aún no tienes agencia" mensaje="Registra tu agencia para empezar." />
{:else}
  <Pagina>
    <PageHeader titulo="Buen día, {agencia.nombre}">
      {#snippet contexto()}
        <span class="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span>{fechaDeHoy(hoy)}</span>
          <span aria-hidden="true">·</span>
          {#if cabecera}
            <StatusPill estado={cabecera.estado} />
            {#if cabecera.detalle}<span>{cabecera.detalle}</span>{/if}
          {/if}
          <button
            type="button"
            class="enlace rounded text-[12.5px] underline underline-offset-2"
            aria-expanded={logoAbierto}
            aria-controls="panel-logo"
            onclick={() => (logoAbierto = !logoAbierto)}
          >
            Cambiar logo
          </button>
        </span>
      {/snippet}
      {#snippet accion()}
        <a class="btn btn-primario" href="#/planes/nuevo">
          <Icono trazo={ICONOS.mas} clase="size-4" />
          Nuevo plan
        </a>
      {/snippet}
    </PageHeader>

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
  </Pagina>
{/if}
