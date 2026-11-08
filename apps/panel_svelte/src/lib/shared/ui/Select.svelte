<script lang="ts">
  import { tick } from 'svelte';
  import Icono from './Icono.svelte';
  import { ICONOS } from './iconos';

  /** Dropdown propio (el <select> nativo no se puede estilizar en oscuro). */
  export type Opcion = { valor: string; etiqueta: string };

  /**
   * Botón + lista de opciones. Se nombra con `etiqueta` (texto) o `etiquetadoPor` (id de una etiqueta visible) y el
   * nombre del botón suma el valor elegido. Teclado: ↓/↑ abren; dentro, ↓/↑/Inicio/Fin mueven, Enter o espacio eligen,
   * Escape cierra y devuelve el foco al botón.
   */
  let {
    opciones,
    valor,
    onchange,
    clase = '',
    etiqueta,
    etiquetadoPor,
  }: {
    opciones: Opcion[];
    valor: string;
    onchange: (nuevo: string) => void;
    clase?: string;
    etiqueta?: string;
    etiquetadoPor?: string;
  } = $props();

  const uid = $props.id();
  const idBoton = `${uid}-boton`;
  const idEtiqueta = `${uid}-etiqueta`;
  const nombre = $derived(etiquetadoPor ?? (etiqueta ? idEtiqueta : undefined));

  let abierto = $state(false);
  let raiz: HTMLDivElement;
  let boton: HTMLButtonElement;
  let items = $state<HTMLLIElement[]>([]);

  const etiquetaActual = $derived(opciones.find((o) => o.valor === valor)?.etiqueta ?? valor);

  async function abrir() {
    abierto = true;
    await tick();
    const elegida = opciones.findIndex((o) => o.valor === valor);
    items[Math.max(elegida, 0)]?.focus();
  }

  function cerrar(devolverFoco = true) {
    abierto = false;
    if (devolverFoco) boton.focus();
  }

  function elegir(v: string) {
    onchange(v);
    cerrar();
  }

  function alTeclearBoton(e: KeyboardEvent) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!abierto) abrir();
    }
  }

  function alTeclearLista(e: KeyboardEvent) {
    const i = items.indexOf((e.target as HTMLElement).closest('li') as HTMLLIElement);
    const ir = (n: number) => {
      e.preventDefault();
      items[Math.min(Math.max(n, 0), items.length - 1)]?.focus();
    };
    if (e.key === 'ArrowDown') ir(i + 1);
    else if (e.key === 'ArrowUp') ir(i - 1);
    else if (e.key === 'Home') ir(0);
    else if (e.key === 'End') ir(items.length - 1);
    else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (i >= 0) elegir(opciones[i].valor);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation(); // dentro de un diálogo, Escape cierra la lista y no el diálogo
      cerrar();
    }
  }

  function alPerderFoco(e: FocusEvent) {
    if (!raiz.contains(e.relatedTarget as Node)) abierto = false;
  }
</script>

<div class="relative min-w-0 {clase}" bind:this={raiz} onfocusout={alPerderFoco}>
  {#if etiqueta}<span id={idEtiqueta} class="sr-only">{etiqueta}</span>{/if}
  <button
    type="button"
    id={idBoton}
    bind:this={boton}
    class="campo flex w-full items-center justify-between gap-2 text-left"
    aria-haspopup="listbox"
    aria-expanded={abierto}
    aria-labelledby={nombre ? `${nombre} ${idBoton}` : undefined}
    onclick={() => (abierto ? cerrar(false) : abrir())}
    onkeydown={alTeclearBoton}
  >
    <span class="truncate">{etiquetaActual}</span>
    <Icono trazo={ICONOS.chevron} clase="size-4 text-tinta-2 transition-transform {abierto ? 'rotate-180' : ''}" />
  </button>

  {#if abierto}
    <!-- Las opciones reciben el foco (↓/↑) y el teclado se atiende en la lista. -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <ul
      class="aparecer absolute z-30 mt-1.5 max-h-60 w-full overflow-y-auto rounded-hoja-chica border
        border-linea bg-superficie py-1 shadow-xl shadow-black/20"
      role="listbox"
      aria-labelledby={nombre}
      onkeydown={alTeclearLista}
    >
      {#each opciones as o, i (o.valor)}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <li
          role="option"
          tabindex="-1"
          aria-selected={o.valor === valor}
          bind:this={items[i]}
          class="flex w-full cursor-pointer items-center gap-2 px-3.5 py-2.5 text-left text-cuerpo transition-colors
            {o.valor === valor ? 'bg-niebla-2 font-bold text-helecho' : 'text-tinta hover:bg-niebla-2'}"
          onclick={() => elegir(o.valor)}
        >
          {#if o.valor === valor}
            <Icono trazo={ICONOS.check} clase="size-3.5" />
          {:else}
            <span class="size-3.5 shrink-0"></span>
          {/if}
          {o.etiqueta}
        </li>
      {/each}
    </ul>
  {/if}
</div>
