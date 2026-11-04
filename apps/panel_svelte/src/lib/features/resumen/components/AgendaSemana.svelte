<script lang="ts">
  import Icono from '$lib/shared/ui/Icono.svelte';
  import { ICONOS } from '$lib/shared/ui/iconos';
  import type { MasAdelante, Semana, TeclaDeBloques } from '../model/semana';
  import { siguienteBloque } from '../model/semana';

  /** «Salidas de la semana»: de lunes a domingo, cada salida un bloque cuyo relleno es lo reservado sobre el cupo. */
  let {
    semana,
    desplazamiento,
    seleccionId,
    masAdelante,
    onsemana,
    onseleccionar,
  }: {
    semana: Semana;
    desplazamiento: 0 | 1;
    seleccionId: string | null;
    masAdelante: MasAdelante | null;
    onsemana: (desplazamiento: 0 | 1) => void;
    onseleccionar: (id: string, el: HTMLElement) => void;
  } = $props();

  const TECLAS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];

  const ids = $derived(semana.dias.flatMap((d) => d.salidas.map((s) => s.id)));
  /** Un solo bloque entra con Tab (el elegido o el primero); las flechas recorren el resto. */
  let foco = $state<string | null>(null);
  const tabulable = $derived(
    foco && ids.includes(foco) ? foco : seleccionId && ids.includes(seleccionId) ? seleccionId : (ids[0] ?? null),
  );
  const bloques: Record<string, HTMLElement> = {};

  function alTeclear(e: KeyboardEvent, id: string) {
    if (!TECLAS.includes(e.key)) return;
    const destino = siguienteBloque(semana, id, e.key as TeclaDeBloques);
    if (!destino) return;
    e.preventDefault();
    foco = destino;
    bloques[destino]?.focus();
  }
</script>

<div class="min-w-0">
  <div class="grid grid-cols-[1fr_auto] items-center gap-x-3 lg:items-end">
    <h2 id="h-semana" class="titulo-seccion col-span-2 lg:col-span-1">Salidas de la semana</h2>
    <p class="font-titulo text-[16px] text-tinta-2 lg:text-[17px]" data-rango>{semana.rango}</p>
    <div
      class="inline-flex rounded-full border border-linea bg-niebla-2 p-[3px] lg:col-start-2 lg:row-span-2 lg:row-start-1"
      role="group"
      aria-label="Elegir semana"
    >
      {#each [[0, 'Esta semana'], [1, 'Siguiente']] as const as [n, texto] (n)}
        <button
          type="button"
          class="min-h-[44px] rounded-full px-3 text-[14.5px] font-bold text-tinta-2 aria-pressed:bg-bosque aria-pressed:text-sobre-bosque lg:px-4 lg:text-[15px]"
          aria-pressed={desplazamiento === n}
          onclick={() => onsemana(n)}
        >
          {texto}
        </button>
      {/each}
    </div>
  </div>

  <ol
    class="-mx-4 mt-3 flex snap-x snap-proximity gap-1.5 overflow-x-auto px-4 pt-1.5 pb-3 lg:mx-0 lg:grid lg:grid-cols-7 lg:gap-1 lg:overflow-visible lg:px-0"
    aria-label="Días de la semana con sus salidas"
    data-semana
  >
    {#each semana.dias as dia (dia.fecha)}
      <li
        class="flex w-[106px] shrink-0 snap-start flex-col rounded-hoja bg-superficie px-[3px] pb-[3px] lg:w-auto lg:min-w-0
          {dia.hoy ? 'border-2 border-heliconia' : 'border border-linea'}"
        data-dia={dia.fecha}
        data-hoy={dia.hoy ? '' : undefined}
        data-pasado={dia.pasado ? '' : undefined}
      >
        <div class="flex flex-col items-center px-1 pt-2 pb-1.5">
          <span class="text-[13px] font-bold tracking-[0.08em] uppercase {dia.pasado ? 'text-tinta-3' : 'text-tinta-2'}">{dia.abreviatura}</span>
          <span
            class="font-titulo grid size-[34px] place-items-center rounded-full text-[22px] leading-none font-bold
              {dia.hoy ? 'bg-heliconia text-sobre-heliconia' : dia.pasado ? 'text-tinta-3' : ''}"
          >{dia.numero}</span>
          {#if dia.hoy}<span class="mt-0.5 text-[12px] font-extrabold tracking-[0.08em] text-heliconia uppercase">Hoy</span>{/if}
        </div>

        {#if dia.salidas.length === 0}
          <p class="px-1 pt-1.5 pb-3.5 text-center text-[14px] text-tinta-3">Sin salidas</p>
        {/if}
        {#each dia.salidas as s (s.id)}
          <button
            type="button"
            class="salida {s.yaSalio ? 'pasada' : ''}"
            bind:this={bloques[s.id]}
            data-salida-id={s.id}
            aria-pressed={s.id === seleccionId}
            aria-label="{s.descripcion}{s.yaSalio ? ' Ya salió.' : ''} Ver quiénes van"
            tabindex={s.id === tabulable ? 0 : -1}
            onclick={(e) => onseleccionar(s.id, e.currentTarget)}
            onkeydown={(e) => alTeclear(e, s.id)}
          >
            <span class="nivel" style:height="{s.porcentaje}%" data-relleno={s.porcentaje} aria-hidden="true">
              {#if s.porcentaje > 0}
                <svg class="cresta" viewBox="0 0 100 8" preserveAspectRatio="none" focusable="false">
                  <path d="M0 5Q12 0 25 4T50 4T75 4T100 4V8H0Z" />
                </svg>
              {/if}
            </span>
            <span class="flex flex-col">
              <span class="font-titulo line-clamp-3 text-[15px] leading-[1.15] font-bold break-words text-tinta" title={s.titulo} data-plan>{s.titulo}</span>
              <span class="font-titulo text-[14px] text-tinta-2 tabular-nums" data-hora>{s.hora}</span>
            </span>
            <span class="mt-0.5 flex flex-col">
              <span class="font-titulo text-[14px] text-tinta tabular-nums" data-cupos><b class="text-[22px] leading-none">{s.reservados}</b> de {s.total}</span>
              <span class="font-titulo text-[13.5px] text-tinta-2" data-libres>{s.yaSalio ? 'Ya salió' : `${s.libres} ${s.libres === 1 ? 'libre' : 'libres'}`}</span>
            </span>
          </button>
        {/each}
      </li>
    {/each}
  </ol>

  <p class="mt-1 flex items-center gap-2.5 text-[14px] text-tinta-2 lg:mt-3">
    <i class="mues" aria-hidden="true"></i>El relleno muestra cuántos cupos de cada salida están reservados.
  </p>

  <div
    class="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-[4px_16px_4px_16px] border border-dashed border-contorno bg-niebla-2 px-4 py-3"
    data-mas-adelante
  >
    {#if masAdelante}
      <p><b>Más adelante</b> · <span class="font-titulo">{masAdelante.texto}</span></p>
      {#if masAdelante.enSiguienteSemana && desplazamiento === 0}
        <button type="button" class="enlace inline-flex min-h-[44px] items-center gap-2 whitespace-nowrap" onclick={() => onsemana(1)}>
          Ver la semana siguiente <Icono trazo={ICONOS.flecha} />
        </button>
      {/if}
    {:else}
      <p><b>Más adelante</b> · no tienes más salidas programadas.</p>
    {/if}
  </div>
</div>

<style>
  /* El bloque de una salida: papel con muesca, relleno de nivel (lo reservado) y cresta de musgo. */
  .salida {
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    gap: 6px;
    width: 100%;
    margin: 0 0 4px;
    min-height: 132px;
    padding: 9px 8px;
    text-align: left;
    overflow: hidden;
    border: 1.5px solid var(--contorno);
    border-radius: 4px 14px 4px 14px;
    background: var(--niebla);
    transition: box-shadow 0.15s, border-color 0.15s;
  }
  .salida:hover {
    border-color: var(--tinta);
  }
  .salida:focus-visible {
    outline-offset: 5px;
    border-radius: 4px 14px 4px 14px;
  }
  .salida[aria-pressed='true'] {
    border: 2.5px solid var(--tinta);
    padding: 8px 7px;
    box-shadow: 0 0 0 4px var(--superficie), 0 0 0 6px var(--heliconia);
  }
  .salida.pasada {
    border-style: dashed;
    background: var(--niebla-2);
  }
  .salida > :global(span:not(.nivel)) {
    position: relative;
    z-index: 1;
  }
  /* Muesca de talonario en el borde derecho. */
  .salida::after {
    content: '';
    position: absolute;
    right: 0;
    top: 0;
    bottom: 0;
    width: 7px;
    z-index: 1;
    pointer-events: none;
    background: linear-gradient(
      to bottom,
      transparent calc(25% - 1px),
      var(--contorno) calc(25% - 1px) 25%,
      transparent 25% calc(50% - 1px),
      var(--contorno) calc(50% - 1px) 50%,
      transparent 50% calc(75% - 1px),
      var(--contorno) calc(75% - 1px) 75%,
      transparent 75%
    );
  }
  .nivel {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 0;
    background: var(--relleno);
  }
  .cresta {
    position: absolute;
    left: 0;
    top: -7px;
    width: 100%;
    height: 8px;
    fill: var(--relleno);
    stroke: var(--musgo);
    stroke-width: 1.4;
    overflow: visible;
  }
  .cresta path {
    vector-effect: non-scaling-stroke;
  }
  .mues {
    display: inline-block;
    width: 26px;
    height: 16px;
    flex: none;
    border: 1.5px solid var(--contorno);
    border-radius: 3px 8px 3px 8px;
    background: linear-gradient(to top, var(--relleno) 45%, var(--niebla) 45%);
  }
</style>
