<script lang="ts">
  import { tick, untrack } from 'svelte';
  import Chips from '$lib/shared/ui/Chips.svelte';
  import Icono from '$lib/shared/ui/Icono.svelte';
  import { ICONOS } from '$lib/shared/ui/iconos';
  import { fechaBogota } from '$lib/features/planes/model/plan';
  import { elegirDia, estadoCalendario, mesParaCalendario, moverFoco, type ActividadPorDia, type Nivel } from '../model/calendario';
  import { inicioDeMes, sumarMeses } from '../model/fechas';
  import {
    esPeriodoInicial,
    PREDEFINIDOS,
    periodoDeSemana,
    periodoInicial,
    periodoPredefinido,
    type Periodo,
    type Predefinido,
  } from '../model/periodo';

  /**
   * El calendario del filtro de fecha: un mes en cuadrícula con los viajeros de cada día (3 niveles) y el total de cada
   * semana, para ver dónde hay actividad. Elige un atajo, un día, una semana o un rango; quien lo muestra recibe el período
   * y lo cierra. Teclado: flechas por días y semanas, Inicio/Fin al lunes/domingo, Re Pág/Av Pág por meses.
   */
  let {
    periodo,
    actividad,
    hoy,
    onelegir,
  }: {
    periodo: Periodo;
    actividad: ActividadPorDia;
    hoy: Date;
    onelegir: (periodo: Periodo) => void;
  } = $props();

  const uid = $props.id();
  const DIAS = [
    ['L', 'lunes'],
    ['M', 'martes'],
    ['M', 'miércoles'],
    ['J', 'jueves'],
    ['V', 'viernes'],
    ['S', 'sábado'],
    ['D', 'domingo'],
  ];
  /** Cada nivel pinta su insignia: el relleno crece con los viajeros. */
  const NIVELES: Record<Nivel, string> = {
    0: 'border-contorno text-tinta-2',
    1: 'border-helecho text-tinta',
    2: 'border-helecho bg-helecho/30 text-tinta',
    3: 'border-helecho bg-helecho text-sobre-helecho',
  };
  const FILA = 'grid grid-cols-[3rem_repeat(7,minmax(0,1fr))] gap-0.5 sm:grid-cols-[3.5rem_repeat(7,minmax(0,1fr))]';

  // Al abrir, el mes y el día con foco son los del período; después se mueven con los botones y el teclado.
  let vista = $state(untrack(() => inicioDeMes(periodo.desde)));
  let foco = $state(untrack(() => periodo.desde));
  let modoRango = $state(false);
  let ancla = $state<string | null>(null);
  let cuadricula: HTMLElement;

  const mes = $derived(mesParaCalendario(actividad, vista, hoy, ancla ? { desde: ancla, hasta: ancla } : periodo));
  const estado = $derived(estadoCalendario({ modoRango, ancla, periodo, actividad, hoy }));
  const sinFiltro = $derived(esPeriodoInicial(periodo));
  const numeroDeHoy = $derived(Number(fechaBogota(hoy).slice(8)));

  function elegir(dia: string) {
    foco = dia;
    const r = elegirDia(modoRango, ancla, dia);
    ancla = r.ancla;
    if (r.periodo) {
      modoRango = false;
      onelegir(r.periodo);
    }
  }

  function cambiarMes(meses: number) {
    vista = inicioDeMes(sumarMeses(vista, meses));
    foco = vista;
  }

  async function alTeclear(e: KeyboardEvent, dia: string) {
    const destino = moverFoco(dia, e.key);
    if (!destino) return;
    e.preventDefault();
    foco = destino;
    vista = inicioDeMes(destino);
    await tick();
    cuadricula.querySelector<HTMLElement>(`[data-dia="${destino}"]`)?.focus();
  }

  function quitar() {
    if (!sinFiltro) onelegir(periodoInicial(hoy));
  }

  const numero = (d: { hoy: boolean; extremo: boolean; delMes: boolean }) =>
    d.hoy ? 'bg-heliconia font-bold text-sobre-heliconia' : d.extremo ? 'font-semibold text-sobre-bosque' : d.delMes ? 'font-semibold' : 'text-tinta-3';
</script>

<Chips
  etiqueta="Períodos rápidos"
  opciones={PREDEFINIDOS.map((p) => ({ valor: p.clave, etiqueta: p.texto }))}
  valor={periodo.clave}
  onchange={(clave) => onelegir(periodoPredefinido(clave as Predefinido, hoy))}
/>

<div class="mt-4 mb-2 flex items-center justify-between gap-2">
  <button type="button" class="boton-icono" aria-label="Mes anterior" onclick={() => cambiarMes(-1)}>
    <Icono trazo={ICONOS.chevron} clase="size-5 rotate-90" />
  </button>
  <h3 id="{uid}-mes" class="text-center text-destacado" aria-live="polite">{mes.titulo}</h3>
  <button type="button" class="boton-icono" aria-label="Mes siguiente" onclick={() => cambiarMes(1)}>
    <Icono trazo={ICONOS.chevron} clase="size-5 -rotate-90" />
  </button>
</div>

<div role="grid" aria-labelledby="{uid}-mes" class="grid gap-0.5" bind:this={cuadricula}>
  <div role="row" class={FILA}>
    <span role="columnheader" class="px-0.5 py-0.5 text-center text-nota font-bold text-tinta-2">Semana</span>
    {#each DIAS as [inicial, nombre] (nombre)}
      <span role="columnheader" aria-label={nombre} class="px-0.5 py-0.5 text-center text-nota font-bold text-tinta-2">{inicial}</span>
    {/each}
  </div>

  {#each mes.semanas as s (s.lunes)}
    <div role="row" class={FILA}>
      <div role="rowheader">
        <button
          type="button"
          data-semana={s.lunes}
          aria-pressed={s.seleccionada}
          aria-label={s.etiqueta}
          class="flex min-h-14 w-full flex-col items-center justify-center rounded-campo border p-0.5 hover:border-contorno
            {s.seleccionada
            ? 'border-bosque bg-bosque text-sobre-bosque'
            : s.salidas > 0
              ? 'border-linea bg-niebla-2 text-tinta'
              : 'border-transparent text-tinta'}"
          onclick={() => onelegir(periodoDeSemana(s.lunes))}
        >
          {#if s.salidas > 0}
            <b class="cifra text-cuerpo leading-tight" data-total>{s.viajeros}</b>
            <small class="text-nota {s.seleccionada ? 'text-sobre-bosque-2' : 'text-tinta-2'}">viaj.</small>
          {:else}
            <b class="font-normal text-tinta-3" aria-hidden="true">—</b>
          {/if}
        </button>
      </div>
      {#each s.dias as d (d.fecha)}
        <div role="gridcell">
          <button
            type="button"
            data-dia={d.fecha}
            data-autofocus={d.fecha === foco ? '' : undefined}
            data-extremo={d.extremo ? '' : undefined}
            aria-pressed={d.seleccionado}
            aria-label={d.etiqueta}
            tabindex={d.fecha === foco ? 0 : -1}
            class="flex min-h-14 w-full flex-col items-center justify-start gap-0.5 rounded-campo border py-0.5 outline-offset-1 hover:border-contorno
              {d.extremo
              ? 'border-bosque bg-bosque text-sobre-bosque'
              : d.seleccionado
                ? 'border-contorno bg-helecho/15 text-tinta'
                : 'border-transparent text-tinta hover:bg-niebla-2'}"
            onclick={() => elegir(d.fecha)}
            onkeydown={(e) => alTeclear(e, d.fecha)}
          >
            <span class="cifra grid h-6 min-w-6 place-items-center rounded-full text-detalle leading-none {numero(d)}">{d.numero}</span>
            {#if d.salidas > 0}
              <span
                data-viajeros
                data-nivel={d.nivel}
                class="cifra inline-grid h-5 min-w-7 place-items-center rounded-full border-2 px-1.5 text-nota leading-none font-bold
                  {d.extremo ? 'border-sobre-bosque bg-sobre-bosque text-bosque' : NIVELES[d.nivel]}">{d.viajeros}</span
              >
            {/if}
          </button>
        </div>
      {/each}
    </div>
  {/each}
</div>

<div class="mt-3 grid gap-1.5 text-detalle text-tinta-2" data-leyenda>
  <p class="flex flex-wrap items-center gap-x-2 gap-y-1.5">
    <span>Viajeros por día:</span>
    {#each [[1, '1–9'], [2, '10–19'], [3, '20 o más']] as const as [nivel, rango] (nivel)}
      <span class="cifra inline-grid h-5 min-w-7 place-items-center rounded-full border-2 px-1.5 text-nota leading-none font-bold {NIVELES[nivel]}">{rango}</span>
    {/each}
  </p>
  <p class="flex flex-wrap items-center gap-x-2 gap-y-1.5">
    <span class="cifra grid size-6 place-items-center rounded-full bg-heliconia text-nota font-bold text-sobre-heliconia" aria-hidden="true">{numeroDeHoy}</span>
    <span>Hoy</span>
    <span aria-hidden="true" class="opacity-50">·</span>
    <span class="inline-block h-4 w-6 rounded-hoja-chica border border-linea bg-niebla-2" aria-hidden="true"></span>
    <span>Semana con salidas: total de viajeros</span>
  </p>
</div>

<div class="mt-3 flex flex-wrap gap-2">
  <button type="button" class="chip" aria-pressed={modoRango} onclick={() => ((modoRango = !modoRango), (ancla = null))}>
    <Icono trazo={ICONOS.calendario} clase="size-4" />
    Elegir un rango de días
  </button>
  <button
    type="button"
    class="btn btn-texto"
    aria-disabled={sinFiltro ? 'true' : undefined}
    title={sinFiltro ? 'No hay un filtro de fecha activo' : undefined}
    onclick={quitar}
  >
    Quitar filtro
  </button>
</div>

<p class="mt-3 min-h-11 border-t border-linea pt-3 text-detalle text-tinta-2" role="status" data-estado>
  {#if estado.titulo}<b class="block text-tinta">{estado.titulo}</b>{' '}{/if}{estado.texto}
</p>
