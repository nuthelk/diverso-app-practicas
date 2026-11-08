<script lang="ts">
  import { tick, untrack } from 'svelte';
  import Chips from '$lib/shared/ui/Chips.svelte';
  import Icono from '$lib/shared/ui/Icono.svelte';
  import { ICONOS } from '$lib/shared/ui/iconos';
  import { cop, plural } from '$lib/shared/lib/format';
  import { quienesVan } from '../api/resumen.api';
  import { diaCorto, diaLargo } from '../model/fechas';
  import { esPeriodoInicial, tituloPeriodo, viajesDe, type Periodo } from '../model/periodo';
  import { reservasPorFecha, type EstadoQuienes, type ReservaDeSalida } from '../model/quienes-van';
  import {
    conteoPorFiltro,
    filtrarSalidas,
    filtroInicial,
    SALIDAS_POR_VEZ,
    textoMostrando,
    totalesDeSalidas,
    type FiltroSalidas,
    type Salida,
  } from '../model/salidas';
  import QuienesVan from './QuienesVan.svelte';

  /**
   * «Salidas del período»: tabla con la ocupación, los pendientes de pago y lo vendido de cada salida, el filtro «Qué
   * salidas ver» y, bajo cada fila, «Ver quiénes van». Quien la usa la vuelve a montar al cambiar de período (`{#key}`):
   * el filtro, las filas visibles y la fila abierta arrancan de nuevo.
   */
  let {
    salidas,
    periodo,
    onquitarfiltro,
  }: {
    /** Todas las de ese período, sin filtrar. */
    salidas: Salida[];
    periodo: Periodo;
    onquitarfiltro: () => void;
  } = $props();

  type Reservas = { estado: EstadoQuienes; reservas: ReservaDeSalida[] };

  let filtro = $state<FiltroSalidas>(untrack(() => filtroInicial(salidas)));
  let limite = $state(SALIDAS_POR_VEZ);
  let abierta = $state<string | null>(null);
  let quienes = $state<Record<string, Reservas>>({});
  /** Solo vale la última petición de cada salida: si se cierra y se reabre, la respuesta vieja se descarta. */
  const peticiones: Record<string, number> = {};
  let raiz: HTMLElement;

  const conteos = $derived(conteoPorFiltro(salidas));
  const lista = $derived(filtrarSalidas(salidas, filtro));
  const visibles = $derived(lista.slice(0, limite));
  const totales = $derived(totalesDeSalidas(lista));

  // Con `display: block` en pantallas angostas las filas pierden su semántica de tabla: el rol la conserva (como TablaDatos).
  const rol = (r: string) => ({ role: r });

  async function cargarQuienes(id: string) {
    const mia = (peticiones[id] = (peticiones[id] ?? 0) + 1);
    quienes[id] = { estado: 'cargando', reservas: [] };
    try {
      const filas = await quienesVan([id]);
      if (mia === peticiones[id]) quienes[id] = { estado: 'ok', reservas: reservasPorFecha(filas).get(id) ?? [] };
    } catch {
      if (mia === peticiones[id]) quienes[id] = { estado: 'error', reservas: [] };
    }
  }

  function alternar(id: string) {
    if (abierta === id) {
      abierta = null;
      return;
    }
    abierta = id;
    cargarQuienes(id);
  }

  async function elegirFiltro(nuevo: string, enfocar = false) {
    filtro = nuevo as FiltroSalidas;
    limite = SALIDAS_POR_VEZ;
    abierta = null;
    if (!enfocar) return;
    await tick();
    raiz.querySelector<HTMLElement>('[aria-label="Qué salidas ver"] [aria-pressed="true"]')?.focus();
  }

  async function mostrarMas() {
    const primera = limite;
    limite += SALIDAS_POR_VEZ;
    await tick();
    raiz.querySelectorAll<HTMLElement>('[data-plan-btn]')[primera]?.focus();
  }
</script>

<section class="tarjeta overflow-hidden" aria-labelledby="h-salidas" bind:this={raiz}>
  <div class="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 px-5 pt-4 pb-3">
    <div>
      <h2 id="h-salidas" class="text-seccion">Salidas del período</h2>
      {#if salidas.length > 0}<p class="mt-0.5 text-detalle text-tinta-2">Ordenadas por fecha · {tituloPeriodo(periodo)}</p>{/if}
    </div>
    <Chips
      etiqueta="Qué salidas ver"
      valor={filtro}
      onchange={(v) => elegirFiltro(v)}
      opciones={[
        { valor: 'proximas', etiqueta: 'Próximas', cantidad: conteos.proximas },
        { valor: 'ya', etiqueta: 'Ya salieron', cantidad: conteos.ya },
        { valor: 'todas', etiqueta: 'Todas', cantidad: conteos.todas },
      ]}
    />
  </div>

  {#if lista.length === 0}
    <div class="border-t border-linea px-5 py-7 text-center text-tinta-2" data-vacio>
      {#if salidas.length > 0}
        <p class="font-bold text-tinta">No hay salidas {filtro === 'proximas' ? 'próximas' : 'que ya hayan salido'} en este período.</p>
        <p class="mt-1 mb-3">Cambia el filtro para ver las demás.</p>
        <button type="button" class="btn btn-secundario btn-chico" onclick={() => elegirFiltro('todas', true)}>Ver todas ({salidas.length})</button>
      {:else}
        <p class="font-bold text-tinta">No hay salidas {viajesDe(periodo)}.</p>
        <p class="mt-1 mb-3">Prueba con otro período o quita el filtro.</p>
        {#if esPeriodoInicial(periodo)}
          <a class="btn btn-secundario btn-chico" href="#/planes">Agregar fechas</a>
        {:else}
          <button type="button" class="btn btn-secundario btn-chico" onclick={onquitarfiltro}>Quitar filtro</button>
        {/if}
      {/if}
    </div>
  {:else}
    <div class="tabla-datos overflow-x-auto">
      <table class="tabla" {...rol('table')}>
        <caption class="sr-only">Salidas del período seleccionado, ordenadas por fecha</caption>
        <thead>
          <tr>
            <th scope="col">Fecha y hora</th>
            <th scope="col">Plan</th>
            <th scope="col">Ocupación</th>
            <th scope="col" class="num">Viajeros</th>
            <th scope="col" class="num">Pendientes</th>
            <th scope="col" class="num">Vendido</th>
          </tr>
        </thead>
        <tbody {...rol('rowgroup')}>
          {#each visibles as s (s.id)}
            <tr {...rol('row')} data-salida-id={s.id}>
              <td {...rol('cell')} data-th="Fecha y hora" data-principal>
                <span class="whitespace-nowrap">
                  <b>{diaCorto(s.fecha)}</b>
                  {#if s.hoy}<span class="pildora pildora-hoy">Hoy</span>{/if}
                  {#if s.yaSalio}<span class="pildora pildora-neutra">Salió</span>{/if}
                  <span class="cifra ml-1.5 text-detalle font-normal text-tinta-2">{s.hora}</span>
                </span>
              </td>
              <td {...rol('cell')} data-th="Plan" data-principal>
                <button
                  type="button"
                  data-plan-btn
                  class="-ml-2.5 inline-flex min-h-10 items-center gap-1.5 rounded-campo px-2.5 text-left font-semibold hover:bg-niebla-2"
                  aria-expanded={abierta === s.id}
                  aria-controls="detalle-{s.id}"
                  aria-label="{s.titulo}, {diaLargo(s.fecha)}. Ver quiénes van"
                  onclick={() => alternar(s.id)}
                >
                  {s.titulo}
                  <Icono trazo={ICONOS.chevron} clase="size-4 transition-transform {abierta === s.id ? 'rotate-180' : ''}" />
                </button>
              </td>
              <td {...rol('cell')} data-th="Ocupación">
                <span class="flex items-center gap-2.5 whitespace-nowrap">
                  <span class="block h-2 w-24 shrink-0 overflow-hidden rounded-pildora border border-contorno bg-niebla-2 max-[820px]:w-full max-[820px]:max-w-48" aria-hidden="true">
                    <i class="block h-full bg-helecho" style:width="{s.porcentaje}%"></i>
                  </span>
                  <span class="cifra min-w-14 text-detalle">{s.reservados}/{s.total}{' '}<span class="sr-only">cupos ocupados</span></span>
                  {#if s.total > 0 && s.libres === 0}<span class="pildora pildora-ok">Lleno</span>{/if}
                </span>
              </td>
              <td {...rol('cell')} class="num" data-th="Viajeros">{s.reservados}</td>
              <td {...rol('cell')} class="num" data-th="Pendientes">
                {#if s.pendientes > 0}<span class="pildora pildora-alerta">{s.pendientes}</span>{:else}<span class="text-tinta-3">0</span>{/if}
              </td>
              <td {...rol('cell')} class="num font-bold" data-th="Vendido">{cop(s.vendido)}</td>
            </tr>
            {#if abierta === s.id}
              <tr {...rol('row')} id="detalle-{s.id}" data-detalle>
                <td {...rol('cell')} colspan="6" data-principal class="bg-niebla p-0">
                  <div class="px-5 pt-3.5 pb-4 max-[820px]:px-0">
                    <QuienesVan
                      salida={s}
                      estado={quienes[s.id]?.estado ?? 'cargando'}
                      reservas={quienes[s.id]?.reservas ?? []}
                      onreintentar={() => cargarQuienes(s.id)}
                    />
                  </div>
                </td>
              </tr>
            {/if}
          {/each}
        </tbody>
        <tfoot {...rol('rowgroup')}>
          <tr {...rol('row')} class="max-[820px]:flex-wrap max-[820px]:gap-y-1">
            <th scope="row" colspan="3" {...rol('rowheader')}>Total · {totales.salidas} {plural(totales.salidas, 'salida', 'salidas')}</th>
            <td {...rol('cell')} class="num"><span class="hidden font-normal text-tinta-2 max-[820px]:inline">Viajeros</span>{' '}{totales.viajeros}</td>
            <td {...rol('cell')} class="num"><span class="hidden font-normal text-tinta-2 max-[820px]:inline">Pendientes</span>{' '}{totales.pendientes}</td>
            <td {...rol('cell')} class="num"><span class="hidden font-normal text-tinta-2 max-[820px]:inline">Vendido</span>{' '}{cop(totales.vendido)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
    <div class="flex flex-wrap items-center justify-between gap-3 border-t border-linea px-5 py-3 text-detalle text-tinta-2">
      <span data-mostrando>{textoMostrando(visibles.length, lista.length)}</span>
      {#if lista.length > limite}
        <button type="button" class="btn btn-secundario btn-chico" onclick={mostrarMas}>Mostrar más ({lista.length - limite})</button>
      {/if}
    </div>
  {/if}
</section>
