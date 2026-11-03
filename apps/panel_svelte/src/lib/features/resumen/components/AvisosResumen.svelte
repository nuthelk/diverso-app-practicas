<script lang="ts">
  import { TONOS_AVISO } from '$lib/shared/ui/tonos';
  import type { AvisoResumen } from '../model/resumen';

  let { avisos }: { avisos: AvisoResumen[] } = $props();
</script>

<section class="mt-5" aria-label="Avisos">
  <ul class="space-y-2">
    {#each avisos as a (a.clave)}
      <li class="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl px-4 py-[11px] text-[13.5px] leading-[1.35] {TONOS_AVISO[a.tono]}">
        <svg class="size-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M12 9v4m0 4h.01M10.3 3.9L2.4 18a2 2 0 001.7 3h15.8a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />
        </svg>
        <span class="min-w-[200px] flex-1">{a.texto}</span>
        {#if a.accion}
          <a href={'#' + a.accion.ruta} class="shrink-0 font-bold underline underline-offset-2">{a.accion.texto}</a>
        {/if}
      </li>
    {/each}
  </ul>
</section>
