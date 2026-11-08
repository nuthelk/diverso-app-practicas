<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icono from './Icono.svelte';
  import { ICONOS } from './iconos';

  /** Cabecera de pantalla: título (28 px), una línea de contexto y, a la derecha, la acción principal. */
  let {
    titulo,
    atras,
    junto,
    contexto,
    accion,
  }: {
    titulo: string;
    /** Enlace pequeño sobre el título para volver a la lista. */
    atras?: { href: string; texto: string };
    /** Algo que va pegado al título (una píldora de estado). */
    junto?: Snippet;
    contexto?: Snippet;
    accion?: Snippet;
  } = $props();
</script>

<header class="flex flex-wrap items-end gap-x-4 gap-y-3">
  <div class="min-w-0 flex-1 basis-[260px]">
    {#if atras}
      <a href={atras.href} class="enlace mb-1 inline-flex min-h-11 items-center gap-1.5 text-cuerpo">
        <Icono trazo={ICONOS.atras} clase="size-4" />
        {atras.texto}
      </a>
    {/if}
    <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
      <h1 class="text-pagina text-balance">{titulo}</h1>
      {#if junto}{@render junto()}{/if}
    </div>
    {#if contexto}
      <p class="mt-1 max-w-[68ch] text-cuerpo text-tinta-2">{@render contexto()}</p>
    {/if}
  </div>
  {#if accion}
    <div class="flex shrink-0 flex-wrap items-center gap-2">{@render accion()}</div>
  {/if}
</header>
