<script lang="ts">
  import type { Snippet } from 'svelte';

  /** Tarjeta: con título lleva una cabecera con línea inferior, una acción a la derecha y descripción opcional. */
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

<section
  class="tarjeta {titulo ? 'overflow-hidden' : ''} {clase}"
  aria-labelledby={titulo ? uid : undefined}
  aria-label={titulo ? undefined : etiqueta}
>
  {#if titulo}
    <div class="border-b border-linea px-5 pt-4 pb-3">
      <div class="flex items-baseline justify-between gap-3">
        <h2 id={uid} class="text-seccion">{titulo}</h2>
        {#if accion}{@render accion()}{/if}
      </div>
      {#if descripcion}<p class="mt-0.5 text-detalle text-tinta-2">{descripcion}</p>{/if}
    </div>
  {/if}
  <div class={sinRelleno ? '' : 'p-5'}>{@render children()}</div>
</section>
