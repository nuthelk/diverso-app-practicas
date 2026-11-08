<script lang="ts">
  import Skeleton from '$lib/shared/ui/Skeleton.svelte';
  import Pagina from '$lib/shared/ui/Pagina.svelte';
  import PageHeader from '$lib/shared/ui/PageHeader.svelte';
  import Icono from '$lib/shared/ui/Icono.svelte';
  import AlertaError from '$lib/shared/ui/AlertaError.svelte';
  import { ICONOS } from '$lib/shared/ui/iconos';
  import Empty from '$lib/shared/ui/Empty.svelte';
  import LogoAgencia from '$lib/features/agencias/components/LogoAgencia.svelte';
  import { misVentas, ventas } from '$lib/features/ventas/api/ventas.api';
  import { misLiquidaciones, cuentasResumen } from '$lib/features/liquidaciones/api/liquidaciones.api';
  import { mensajeError } from '$lib/shared/api/errores';
  import { fechaBogota } from '$lib/features/planes/model/plan';
  import type { Agency } from '$lib/features/agencias/model/agencia';
  import type { Plan } from '$lib/features/planes/model/plan';
  import type { VentaRow } from '$lib/features/ventas/model/ventas';
  import type { Liquidacion } from '$lib/features/liquidaciones/model/liquidaciones';
  import { resenasRecientes } from '../api/resumen.api';
  import { actividadPorDia } from '../model/calendario';
  import { diaLargo } from '../model/fechas';
  import { periodoInicial, textoChip, type Periodo } from '../model/periodo';
  import { avisosResumen, cifrasDelPeriodo, kpiProximoPago, kpisDelPeriodo, proximoPago } from '../model/resumen';
  import { salidasDeAgencia, salidasDelPeriodo } from '../model/salidas';
  import type { ResenaReciente } from '../model/quienes-van';
  import { tusPlanes } from '../model/tus-planes';
  import { resenasParaMostrar } from '../model/resenas';
  import PorResolver from '../components/PorResolver.svelte';
  import PeriodoSelector from '../components/PeriodoSelector.svelte';
  import CifrasDelPeriodo from '../components/CifrasDelPeriodo.svelte';
  import SalidasDelPeriodo from '../components/SalidasDelPeriodo.svelte';
  import TusPlanes from '../components/TusPlanes.svelte';
  import ResenasRecientes from '../components/ResenasRecientes.svelte';

  const hoy = new Date();
  const hoyISO = fechaBogota(hoy);

  let cargando = $state(true);
  let error = $state('');
  let agencia = $state<Agency | null>(null);
  let planes = $state<Plan[]>([]);
  let ventasLista = $state<VentaRow[]>([]);
  /** null: no se pudieron consultar (el resto del Resumen no depende de ellos). */
  let liquidaciones = $state<Liquidacion[] | null>(null);
  let hayCuenta = $state<boolean | null>(null);
  /** null: no se pudieron consultar. */
  let resenas = $state<ResenaReciente[] | null>(null);
  let logoAbierto = $state(false);

  /** El período elegido (lo que dice el chip) y el de las cifras que se ven: difieren mientras llegan las ventas del nuevo. */
  let periodo = $state<Periodo>(periodoInicial(hoy));
  let periodoMostrado = $state<Periodo>(periodoInicial(hoy));
  let cargandoPeriodo = $state(false);
  let errorPeriodo = $state('');
  /** Solo vale la última petición de ventas: si se cambia de período antes de que llegue una, se descarta. */
  let peticion = 0;

  async function cargar() {
    cargando = true;
    error = '';
    try {
      // Viajes del período inicial: lo que se vendió y lo que corresponde. Las salidas salen de los planes.
      const r = await misVentas({ desde: periodoMostrado.desde, hasta: periodoMostrado.hasta });
      agencia = r.agencia;
      planes = r.planes;
      ventasLista = r.ventas;
      if (r.agencia) {
        const id = r.agencia.id;
        const [liqs, cuentas, ultimas] = await Promise.all([
          misLiquidaciones(id).catch(() => null),
          cuentasResumen().catch(() => null),
          resenasRecientes(3).catch(() => null),
        ]);
        liquidaciones = liqs;
        hayCuenta = cuentas === null ? null : cuentas.some((c) => c.agency_id === id);
        resenas = ultimas;
      }
    } catch (e) {
      error = mensajeError(e);
    } finally {
      cargando = false;
    }
  }

  /** Trae las ventas de los viajes del período elegido; mientras tanto se siguen viendo las del anterior. */
  async function cargarPeriodo() {
    const mia = ++peticion;
    const p = periodo;
    errorPeriodo = '';
    if (!agencia) return;
    if (p.desde === periodoMostrado.desde && p.hasta === periodoMostrado.hasta) {
      // Mismos días que ya están cargados (p. ej. «Este mes» y ese mes elegido a mano): no hay nada que pedir.
      periodoMostrado = p;
      cargandoPeriodo = false;
      return;
    }
    cargandoPeriodo = true;
    try {
      const filas = await ventas(agencia.id, p.desde, p.hasta);
      if (mia !== peticion) return;
      ventasLista = filas;
      periodoMostrado = p;
    } catch (e) {
      if (mia === peticion) errorPeriodo = mensajeError(e);
    } finally {
      if (mia === peticion) cargandoPeriodo = false;
    }
  }

  function elegirPeriodo(p: Periodo) {
    periodo = p;
    cargarPeriodo();
  }

  function logoActualizado(logoUrl: string | null) {
    if (agencia) agencia = { ...agencia, logo_url: logoUrl };
  }

  // Carga al montar (initState): llamada directa, sin $effect.
  cargar();

  const todas = $derived(salidasDeAgencia(planes, hoy));
  /** Los viajeros por día del calendario salen de los cupos tomados de todas las salidas ya cargadas, de cualquier mes. */
  const actividad = $derived(actividadPorDia(todas));
  const delPeriodo = $derived(salidasDelPeriodo(todas, ventasLista, periodoMostrado));
  const kpis = $derived(kpisDelPeriodo(cifrasDelPeriodo(delPeriodo, ventasLista, periodoMostrado), agencia?.comision_pct ?? 0));
  const avisos = $derived(agencia ? avisosResumen({ agencia, planes, hayCuenta, hoy }) : []);
  const pago = $derived(kpiProximoPago(liquidaciones ? proximoPago(liquidaciones, hoy) : null, liquidaciones !== null));
  /** Lo que depende del período se atenúa mientras llegan sus cifras. */
  const atenuado = $derived(cargandoPeriodo ? 'opacity-60 transition-opacity' : 'transition-opacity');
</script>

{#if cargando}
  <Pagina>
    <div class="space-y-4" role="status" aria-label="Cargando">
      <Skeleton clase="h-14 w-80 max-w-full rounded-hoja-chica" />
      <Skeleton clase="h-24 rounded-hoja-chica" />
      <Skeleton clase="h-24 rounded-hoja-chica" />
      <Skeleton clase="h-[360px] rounded-hoja-chica" />
    </div>
  </Pagina>
{:else if error}
  <Empty icono="sinConexion" titulo="Sin conexión" mensaje={error} />
{:else if !agencia}
  <Empty icono="edificio" titulo="Aún no tienes agencia" mensaje="Registra tu agencia para empezar." />
{:else}
  <Pagina>
    <PageHeader titulo="Resumen">
      {#snippet contexto()}
        <time datetime={hoyISO}>{diaLargo(hoyISO)} de {hoyISO.slice(0, 4)}</time>
        ·
        <button type="button" class="enlace rounded" aria-expanded={logoAbierto} aria-controls="panel-logo" onclick={() => (logoAbierto = !logoAbierto)}>
          Cambiar logo
        </button>
      {/snippet}
      {#snippet accion()}
        <PeriodoSelector {periodo} {actividad} {hoy} cargando={cargandoPeriodo} onelegir={elegirPeriodo} />
        <a class="btn btn-primario" href="#/planes/nuevo">
          <Icono trazo={ICONOS.mas} clase="size-4" />
          Nuevo plan
        </a>
      {/snippet}
    </PageHeader>

    {#if logoAbierto}
      <div id="panel-logo" class="mt-4"><LogoAgencia {agencia} onactualizado={logoActualizado} /></div>
    {/if}

    <p class="sr-only" role="status">{cargandoPeriodo ? `Actualizando las cifras de ${textoChip(periodo, hoy)}…` : ''}</p>

    <PorResolver {avisos} />

    {#if errorPeriodo}
      <div class="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2" data-error-periodo>
        <AlertaError>
          No pudimos cargar las cifras de {textoChip(periodo, hoy)}: {errorPeriodo} Seguimos mostrando {textoChip(periodoMostrado, hoy)}.
        </AlertaError>
        <button type="button" class="btn btn-secundario btn-chico" onclick={cargarPeriodo}>Reintentar</button>
      </div>
    {/if}

    <div class="mt-5 {atenuado}" aria-busy={cargandoPeriodo}>
      <CifrasDelPeriodo {kpis} {pago} />
    </div>

    <div class="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div class={atenuado} aria-busy={cargandoPeriodo}>
        {#key periodoMostrado}
          <SalidasDelPeriodo salidas={delPeriodo} periodo={periodoMostrado} onquitarfiltro={() => elegirPeriodo(periodoInicial(hoy))} />
        {/key}
      </div>
      <div class="grid content-start gap-6">
        <div class={atenuado} aria-busy={cargandoPeriodo}><TusPlanes planes={tusPlanes(delPeriodo)} /></div>
        <ResenasRecientes resenas={resenas === null ? null : resenasParaMostrar(resenas, hoy)} />
      </div>
    </div>
  </Pagina>
{/if}
