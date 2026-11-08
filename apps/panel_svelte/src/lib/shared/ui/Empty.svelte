<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icono from './Icono.svelte';
  import { ICONOS, type NombreIcono } from './iconos';

  let {
    titulo,
    mensaje,
    accion,
    children,
    icono = 'alerta',
  }: {
    titulo: string;
    mensaje: string;
    accion?: Snippet;
    children?: Snippet;
    icono?: NombreIcono;
  } = $props();
</script>

<div class="flex flex-col items-center justify-center px-6 py-12 text-center sm:px-10 sm:py-16">
  <div class="flex size-14 items-center justify-center rounded-brote bg-niebla-2 text-helecho ring-1 ring-linea">
    <Icono trazo={ICONOS[icono]} clase="size-6" />
  </div>
  <h3 class="mt-4 text-seccion">{titulo}</h3>
  <p class="mt-1 max-w-sm text-cuerpo text-tinta-2">{mensaje}</p>
  {#if accion || children}
    <div class="mt-5">{@render (accion ?? children)?.()}</div>
  {/if}
</div>
