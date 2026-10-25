<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    titulo,
    mensaje,
    accion,
    children,
    icono = '⚠️',
  }: {
    titulo: string;
    mensaje: string;
    accion?: Snippet;
    children?: Snippet;
    icono?: string;
  } = $props();
</script>

<div class="flex flex-col items-center justify-center px-10 py-20 text-center">
  <div
    class="flex size-16 items-center justify-center rounded-full bg-slate-200/70 text-2xl
      dark:bg-ink-700"
    aria-hidden="true"
  >
    {icono}
  </div>
  <h3 class="mt-4 text-[17px] font-bold tracking-tight">{titulo}</h3>
  <p class="mt-1 max-w-sm text-[13.5px] leading-relaxed text-slate-500 dark:text-slate-400">
    {mensaje}
  </p>
  {#if accion || children}
    <div class="mt-5">{@render (accion ?? children)?.()}</div>
  {/if}
</div>
