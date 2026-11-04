<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icono from './Icono.svelte';
  import Curvas from './Curvas.svelte';
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

<div class="relative flex flex-col items-center justify-center overflow-hidden px-6 py-16 text-center sm:px-10 sm:py-20">
  <Curvas clase="top-1/2 left-1/2 h-[260px] w-[520px] max-w-none -translate-x-1/2 -translate-y-1/2 text-musgo opacity-25" />
  <div class="relative flex size-16 items-center justify-center rounded-brote bg-niebla-2 text-helecho ring-1 ring-linea">
    <Icono trazo={ICONOS[icono]} clase="size-7" />
  </div>
  <h3 class="relative mt-5 text-[24px] leading-[1.2]">{titulo}</h3>
  <p class="relative mt-1.5 max-w-sm text-[16px] leading-relaxed text-tinta-2">{mensaje}</p>
  {#if accion || children}
    <div class="relative mt-6">{@render (accion ?? children)?.()}</div>
  {/if}
</div>
