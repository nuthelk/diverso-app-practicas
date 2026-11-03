<script lang="ts">
  import type { Snippet } from 'svelte';

  /** Tarjeta aireada: título de 15 px con una acción a la derecha, descripción opcional y el contenido. */
  let {
    titulo,
    descripcion,
    etiqueta,
    accion,
    sinRelleno = false,
    clase = '',
    children,
  }: {
    titulo?: string;
    descripcion?: string;
    /** Nombre accesible cuando la tarjeta no lleva título visible. */
    etiqueta?: string;
    accion?: Snippet;
    /** El contenido llega a los bordes (tablas, listas con divisores). */
    sinRelleno?: boolean;
    clase?: string;
    children: Snippet;
  } = $props();

  const uid = $props.id();
</script>

<section class="tarjeta {clase}" aria-labelledby={titulo ? uid : undefined} aria-label={titulo ? undefined : etiqueta}>
  {#if titulo}
    <div class="flex items-baseline justify-between gap-3 px-5 pt-4">
      <h2 id={uid} class="text-[15px] font-bold tracking-[-0.2px]">{titulo}</h2>
      {#if accion}{@render accion()}{/if}
    </div>
    {#if descripcion}<p class="px-5 pt-0.5 text-[12.5px] text-suave">{descripcion}</p>{/if}
  {/if}
  <div class={sinRelleno ? '' : titulo ? 'px-5 pt-4 pb-5' : 'p-5'}>{@render children()}</div>
</section>
