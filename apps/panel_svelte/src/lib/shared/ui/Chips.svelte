<script lang="ts">
  export type OpcionChip = { valor: string; etiqueta: string; cantidad?: number };

  /** Filtro de una lista: un chip por opción, `aria-pressed` en el elegido y, si se da, cuántos elementos tiene cada una. */
  let {
    opciones,
    valor,
    onchange,
    etiqueta,
    clase = '',
  }: {
    opciones: OpcionChip[];
    valor: string;
    onchange: (nuevo: string) => void;
    /** Nombre del grupo para el lector de pantalla («Qué salidas ver»). */
    etiqueta: string;
    clase?: string;
  } = $props();
</script>

<div role="group" aria-label={etiqueta} class="flex flex-wrap gap-1.5 {clase}">
  {#each opciones as o (o.valor)}
    <button type="button" class="chip" aria-pressed={o.valor === valor} onclick={() => onchange(o.valor)}>
      {o.etiqueta}{#if o.cantidad !== undefined}{' '}<span class="tabular-nums opacity-90">{o.cantidad}</span>{/if}
    </button>
  {/each}
</div>
