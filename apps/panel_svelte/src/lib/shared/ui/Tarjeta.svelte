<script lang="ts">
  import type { Snippet } from 'svelte';
  import Curvas from './Curvas.svelte';

  /** Tarjeta: con título lleva una cabecera hundida en la niebla con curvas de nivel, una acción a la derecha y descripción opcional. */
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
    <div class="relative overflow-hidden border-b border-linea bg-niebla-2 px-5 pt-4 pb-3.5">
      <Curvas clase="-top-10 -right-8 h-[150px] w-[260px] text-musgo opacity-40" />
      <div class="relative flex items-baseline justify-between gap-3">
        <h2 id={uid} class="text-[22px] leading-[1.2]">{titulo}</h2>
        {#if accion}{@render accion()}{/if}
      </div>
      {#if descripcion}<p class="relative mt-0.5 text-[15px] text-tinta-2">{descripcion}</p>{/if}
    </div>
  {/if}
  <div class={sinRelleno ? '' : titulo ? 'px-5 pt-5 pb-5' : 'p-5'}>{@render children()}</div>
</section>
