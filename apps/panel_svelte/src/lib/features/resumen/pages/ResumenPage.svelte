<script lang="ts">
  import { tick } from 'svelte';
  import { MediaQuery } from 'svelte/reactivity';
  import Skeleton from '$lib/shared/ui/Skeleton.svelte';
  import Pagina from '$lib/shared/ui/Pagina.svelte';
  import PageHeader from '$lib/shared/ui/PageHeader.svelte';
  import Icono from '$lib/shared/ui/Icono.svelte';
  import Curvas from '$lib/shared/ui/Curvas.svelte';
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
  import { quienesVan, resenasRecientes } from '../api/resumen.api';
  import {
    avisosResumen,
    desdeResumen,
    dineroDelMes,
    estadoCabecera,
    lineaProximoPago,
    proximoPago,
  } from '../model/resumen';
  import { masAdelante, salidaPorDefecto, semanaDeSalidas } from '../model/semana';
  import { reservasPorFecha, type EstadoQuienes, type QuienViaja, type ResenaReciente } from '../model/quienes-van';
  import { tusPlanes } from '../model/tus-planes';
  import { resenasParaMostrar } from '../model/resenas';
  import PorResolver from '../components/PorResolver.svelte';
  import AgendaSemana from '../components/AgendaSemana.svelte';
  import QuienesVan from '../components/QuienesVan.svelte';
  import HojaQuienesVan from '../components/HojaQuienesVan.svelte';
  import TusPlanes from '../components/TusPlanes.svelte';
  import ResenasRecientes from '../components/ResenasRecientes.svelte';
  import DineroDelMes from '../components/DineroDelMes.svelte';

  const hoy = new Date();

  /** Por debajo de 1024 px el panel lateral pasa a ser una hoja inferior (como la barra de navegación). */
  const celular = typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? new MediaQuery('max-width: 1023.98px') : null;
  const esCelular = $derived(celular?.current ?? false);

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

  let desplazamiento = $state<0 | 1>(0);
  let seleccionId = $state<string | null>(null);
  let hojaAbierta = $state(false);
  let abridor: HTMLElement | null = null;
  let quienesEstado = $state<EstadoQuienes>('ok');
  let quienesFilas = $state<QuienViaja[]>([]);
  /** Solo vale la última petición de «Quiénes van»: si se cambia de semana antes de que llegue una, se descarta. */
  let peticion = 0;

  async function cargar() {
    cargando = true;
    error = '';
    try {
      // Viajes del mes en curso: lo que se vendió y lo que corresponde. Las salidas salen de los planes.
      const r = await misVentas({ desde: desdeResumen(hoy) });
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
        seleccionId = salidaPorDefecto(semana);
        cargarQuienes();
      }
    } catch (e) {
      error = mensajeError(e);
    } finally {
      cargando = false;
    }
  }

  /** Quiénes van en TODAS las salidas de la semana mostrada: una llamada por semana, no una por salida. */
  async function cargarQuienes() {
    const mia = ++peticion;
    const ids = semana.dias.flatMap((d) => d.salidas.map((s) => s.id));
    if (ids.length === 0) {
      quienesFilas = [];
      quienesEstado = 'ok';
      return;
    }
    quienesEstado = 'cargando';
    try {
      const filas = await quienesVan(ids);
      if (mia !== peticion) return;
      quienesFilas = filas;
      quienesEstado = 'ok';
    } catch {
      if (mia === peticion) quienesEstado = 'error';
    }
  }

  function elegirSemana(n: 0 | 1) {
    if (n === desplazamiento) return;
    desplazamiento = n;
    seleccionId = salidaPorDefecto(semana);
    hojaAbierta = false;
    cargarQuienes();
  }

  function seleccionar(id: string, el: HTMLElement) {
    seleccionId = id;
    abridor = el;
    if (esCelular) hojaAbierta = true;
  }

  async function cerrarHoja() {
    hojaAbierta = false;
    await tick();
    abridor?.focus();
  }

  function logoActualizado(logoUrl: string | null) {
    if (agencia) agencia = { ...agencia, logo_url: logoUrl };
  }

  // Carga al montar (initState): llamada directa, sin $effect.
  cargar();

  const semana = $derived(semanaDeSalidas(planes, desplazamiento, hoy));
  const despues = $derived(masAdelante(planes, semana.fin, hoy));
  const salidaElegida = $derived(semana.dias.flatMap((d) => d.salidas).find((s) => s.id === seleccionId) ?? null);
  const reservas = $derived((salidaElegida && reservasPorFecha(quienesFilas).get(salidaElegida.id)) || []);
  const avisos = $derived(agencia ? avisosResumen({ agencia, planes, hayCuenta, hoy }) : []);
  const cabecera = $derived(agencia ? estadoCabecera(agencia, hoy) : null);
  const pago = $derived(liquidaciones ? proximoPago(liquidaciones, hoy) : null);
</script>

{#snippet detalle()}
  <QuienesVan salida={salidaElegida} estado={quienesEstado} {reservas} onreintentar={cargarQuienes} />
{/snippet}

{#if cargando}
  <Pagina>
    <div class="space-y-4" role="status" aria-label="Cargando">
      <Skeleton clase="h-14 w-80 max-w-full rounded-lg" />
      <Skeleton clase="h-[96px]" />
      <Skeleton clase="h-[360px]" />
      <Skeleton clase="h-[200px]" />
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
          {#if cabecera}
            <StatusPill estado={cabecera.estado} />
            {#if cabecera.detalle}<span class="font-titulo">{cabecera.detalle}</span>{/if}
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

    <PorResolver {avisos} />

    <section class="mt-9" aria-labelledby="h-semana">
      <div class="grid grid-cols-1 gap-6 ancho:grid-cols-[minmax(0,1fr)_clamp(336px,24vw,480px)] ancho:items-start">
        <AgendaSemana
          {semana}
          {desplazamiento}
          {seleccionId}
          masAdelante={despues}
          onsemana={elegirSemana}
          onseleccionar={seleccionar}
        />
        {#if !esCelular}
          <aside class="overflow-hidden rounded-[8px_30px_8px_30px] border border-linea bg-superficie" aria-labelledby="h-quienes" data-quienes>
            <div class="relative overflow-hidden border-b border-linea bg-niebla-2 px-[22px] pt-4 pb-3">
              <Curvas clase="-top-10 -right-[30px] h-[150px] w-[240px] text-musgo opacity-45" />
              <h2 id="h-quienes" class="relative text-[28px] leading-[1.1]">Quiénes van</h2>
            </div>
            <div class="px-[22px] pt-3.5 pb-5">{@render detalle()}</div>
          </aside>
        {/if}
      </div>
    </section>

    <!-- Abajo: planes y reseñas en dos columnas; con mucho ancho, la plata se suma como tercera columna -->
    <div class="mt-11 grid gap-x-10 gap-y-9 lg:grid-cols-2 ancho:grid-cols-3 lg:items-start">
      <TusPlanes datos={tusPlanes(planes, hoy)} />
      <ResenasRecientes resenas={resenas === null ? null : resenasParaMostrar(resenas, hoy)} />
      <div class="lg:col-span-2 ancho:col-span-1">
        <DineroDelMes dinero={dineroDelMes(ventasLista, agencia.comision_pct, hoy)} proximo={lineaProximoPago(pago, liquidaciones !== null)} />
      </div>
    </div>
  </Pagina>

  {#if esCelular && hojaAbierta}
    <HojaQuienesVan onclose={cerrarHoja}>{@render detalle()}</HojaQuienesVan>
  {/if}
{/if}
