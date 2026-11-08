<script lang="ts">
  import { tick } from 'svelte';
  import Dialogo from '$lib/shared/ui/Dialogo.svelte';
  import Icono from '$lib/shared/ui/Icono.svelte';
  import Spinner from '$lib/shared/ui/Spinner.svelte';
  import { ICONOS } from '$lib/shared/ui/iconos';
  import type { ActividadPorDia } from '../model/calendario';
  import { esPeriodoInicial, periodoInicial, textoChip, type Periodo } from '../model/periodo';
  import CalendarioActividad from './CalendarioActividad.svelte';

  /**
   * El filtro de fecha de la cabecera: un botón con el ícono de calendario y el período (abre el calendario) y, si hay un
   * filtro, una equis que lo quita. El calendario es un diálogo (hoja inferior en el celular): el foco entra en él y,
   * al cerrar con Escape o al elegir, vuelve al botón.
   */
  let {
    periodo,
    actividad,
    hoy,
    cargando,
    onelegir,
  }: {
    periodo: Periodo;
    actividad: ActividadPorDia;
    hoy: Date;
    /** Se están trayendo las cifras del período elegido: el chevron pasa a ser un indicador de carga. */
    cargando: boolean;
    onelegir: (periodo: Periodo) => void;
  } = $props();

  let abierto = $state(false);
  let boton: HTMLButtonElement;

  const texto = $derived(textoChip(periodo, hoy));
  const conFiltro = $derived(!esPeriodoInicial(periodo));

  /** Cierra el calendario y devuelve el foco al botón (el navegador no siempre se lo da al hacer clic: Safari). */
  async function cerrar() {
    abierto = false;
    await tick();
    boton.focus();
  }

  function elegir(p: Periodo) {
    cerrar();
    onelegir(p);
  }

  async function quitar() {
    onelegir(periodoInicial(hoy));
    await tick();
    boton.focus();
  }
</script>

<div
  class="inline-flex max-w-full items-center rounded-pildora border
    {conFiltro ? 'border-helecho bg-helecho/10' : 'border-contorno bg-superficie'}"
  data-periodo
>
  <button
    type="button"
    bind:this={boton}
    class="inline-flex min-h-11 min-w-0 items-center gap-2 rounded-pildora pr-3.5 pl-4 font-bold hover:bg-niebla-2"
    aria-haspopup="dialog"
    aria-expanded={abierto}
    aria-label="Filtrar por fecha. Período actual: {texto}"
    onclick={() => (abierto = true)}
  >
    <Icono trazo={ICONOS.calendario} clase="size-5" />
    <span class="max-w-56 truncate sm:max-w-none">{texto}</span>
    {#if cargando}<Spinner clase="size-4 motion-reduce:animate-none" />{:else}<Icono trazo={ICONOS.chevron} clase="size-4" />{/if}
  </button>
  {#if conFiltro}
    <button type="button" class="mr-0.5 grid size-10 shrink-0 place-items-center rounded-full hover:bg-niebla-2" aria-label="Quitar el filtro de fecha" onclick={quitar}>
      <Icono trazo={ICONOS.cerrar} clase="size-4" />
    </button>
  {/if}
</div>

<Dialogo {abierto} titulo="Filtrar por fecha" descripcion="Elige un día, una semana o un rango: se filtran las salidas y las cifras." oncerrar={cerrar}>
  <CalendarioActividad {periodo} {actividad} {hoy} onelegir={elegir} />
</Dialogo>
