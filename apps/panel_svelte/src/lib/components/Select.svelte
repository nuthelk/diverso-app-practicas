<script lang="ts">
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

<div
  class="relative {clase}"
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
    <svg
      class="size-4 shrink-0 text-slate-400 transition-transform {abierto ? 'rotate-180' : ''}"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  </button>

  {#if abierto}
    <ul
      class="aparecer absolute z-30 mt-1.5 max-h-60 w-full overflow-y-auto rounded-xl border
        border-slate-200 bg-white py-1 shadow-xl
        dark:border-ink-600 dark:bg-ink-700 dark:shadow-black/60"
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
              ? 'bg-brand-600/12 font-bold text-brand-700 dark:text-brand-200'
              : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-ink-600'}"
            onclick={() => elegir(o.valor)}
          >
            {#if o.valor === valor}
              <svg class="size-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
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

<style>
  .campo {
    border-radius: 12px;
    border: 1px solid rgb(0 0 0 / 0.1);
    background: rgb(0 0 0 / 0.03);
    padding: 9px 14px;
    font-size: 14px;
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  :global(.dark) .campo {
    border-color: rgb(255 255 255 / 0.09);
    background: rgb(255 255 255 / 0.04);
  }
  .campo:focus {
    border-color: var(--color-brand-400);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-brand-400) 25%, transparent);
  }
</style>
