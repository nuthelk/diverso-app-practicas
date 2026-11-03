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

<div class="flex flex-col items-center justify-center px-10 py-20 text-center">
  <div class="flex size-14 items-center justify-center rounded-full bg-brand-600/10 text-acento-ink dark:bg-brand-400/15">
    <Icono trazo={ICONOS[icono]} clase="size-6" />
  </div>
  <h3 class="mt-4 text-[17px] font-bold tracking-tight">{titulo}</h3>
  <p class="mt-1 max-w-sm text-[13.5px] leading-relaxed text-suave">{mensaje}</p>
  {#if accion || children}
    <div class="mt-5">{@render (accion ?? children)?.()}</div>
  {/if}
</div>
