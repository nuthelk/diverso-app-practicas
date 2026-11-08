<script lang="ts">
  import Icono from './Icono.svelte';

  export type OpcionSegmento = { valor: string; etiqueta: string; icono?: string };

  /**
   * Elegir una opción entre pocas (Sistema / Claro / Oscuro): grupo de radios. Solo la elegida entra con Tab; las flechas
   * eligen la vecina y le pasan el foco.
   */
  let {
    opciones,
    valor,
    onchange,
    etiqueta,
    etiquetadoPor,
  }: {
    opciones: OpcionSegmento[];
    valor: string;
    onchange: (nuevo: string) => void;
    /** Nombre del grupo; o `etiquetadoPor` con el id de una etiqueta visible. */
    etiqueta?: string;
    etiquetadoPor?: string;
  } = $props();

  let botones = $state<HTMLButtonElement[]>([]);

  const PASO: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

  function alTeclear(e: KeyboardEvent, i: number) {
    const paso = PASO[e.key];
    if (!paso) return;
    e.preventDefault();
    const siguiente = (i + paso + opciones.length) % opciones.length;
    onchange(opciones[siguiente].valor);
    botones[siguiente]?.focus();
  }
</script>

<div
  role="radiogroup"
  aria-label={etiqueta}
  aria-labelledby={etiquetadoPor}
  class="grid gap-0.5 rounded-pildora border border-contorno bg-niebla-2 p-[3px]"
  style="grid-template-columns: repeat({opciones.length}, minmax(0, 1fr))"
>
  {#each opciones as o, i (o.valor)}
    {@const elegida = o.valor === valor}
    <button
      type="button"
      role="radio"
      aria-checked={elegida}
      tabindex={elegida ? 0 : -1}
      bind:this={botones[i]}
      class="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-pildora px-1.5 text-detalle font-bold transition-colors
        {elegida ? 'bg-helecho text-sobre-helecho' : 'text-tinta-2 hover:text-tinta'}"
      onclick={() => onchange(o.valor)}
      onkeydown={(e) => alTeclear(e, i)}
    >
      {#if o.icono}<Icono trazo={o.icono} clase="size-4" />{/if}
      {o.etiqueta}
    </button>
  {/each}
</div>
