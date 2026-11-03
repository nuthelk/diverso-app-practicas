<script lang="ts">
  import Icono from './Icono.svelte';
  import { ICONOS } from './iconos';

  /** Dropdown propio (el <select> nativo no se puede estilizar en oscuro). */
  export type Opcion = { valor: string; etiqueta: string };

  let {
    opciones,
    valor,
    onchange,
    clase = '',
  }: {
    opciones: Opcion[];
    valor: string;
    onchange: (nuevo: string) => void;
    clase?: string;
  } = $props();

  let abierto = $state(false);
  let raiz: HTMLDivElement;

  const etiqueta = $derived(opciones.find((o) => o.valor === valor)?.etiqueta ?? valor);

  function elegir(v: string) {
    onchange(v);
    abierto = false;
  }

  function alPerderFoco(e: FocusEvent) {
    if (!raiz.contains(e.relatedTarget as Node)) abierto = false;
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
  class="relative min-w-0 {clase}"
  role="group"
  bind:this={raiz}
  onfocusout={alPerderFoco}
  onkeydown={(e) => e.key === 'Escape' && (abierto = false)}
>
  <button
    type="button"
    class="campo flex w-full items-center justify-between gap-2 text-left"
    aria-haspopup="listbox"
    aria-expanded={abierto}
    onclick={() => (abierto = !abierto)}
  >
    <span class="truncate">{etiqueta}</span>
    <Icono trazo={ICONOS.chevron} clase="size-4 text-suave transition-transform {abierto ? 'rotate-180' : ''}" />
  </button>

  {#if abierto}
    <ul
      class="aparecer absolute z-30 mt-1.5 max-h-60 w-full overflow-y-auto rounded-xl border
        border-linea bg-white py-1 shadow-xl shadow-slate-900/8
        dark:bg-ink-700 dark:shadow-black/60"
      role="listbox"
    >
      {#each opciones as o (o.valor)}
        <li>
          <button
            type="button"
            role="option"
            aria-selected={o.valor === valor}
            class="flex w-full items-center gap-2 px-3.5 py-2 text-left text-[13.5px] transition-colors
              {o.valor === valor
              ? 'bg-brand-600/12 font-bold text-acento-ink'
              : 'text-slate-700 hover:bg-hover dark:text-slate-200 dark:hover:bg-ink-600'}"
            onclick={() => elegir(o.valor)}
          >
            {#if o.valor === valor}
              <Icono trazo={ICONOS.check} clase="size-3.5" />
            {:else}
              <span class="size-3.5 shrink-0"></span>
            {/if}
            {o.etiqueta}
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>
