<script lang="ts">
  import Aviso from '$lib/shared/ui/Aviso.svelte';
  import type { AvisoResumen } from '../model/resumen';

  let { avisos }: { avisos: AvisoResumen[] } = $props();
</script>

<section class="mt-5" aria-label="Avisos">
  <ul class="space-y-2">
    {#each avisos as a (a.clave)}
      <li>
        <Aviso tono={a.tono}>
          {a.texto}
          {#snippet accion()}
            {#if a.accion}
              <a href={'#' + a.accion.ruta} class="shrink-0 font-bold underline underline-offset-2">{a.accion.texto}</a>
            {/if}
          {/snippet}
        </Aviso>
      </li>
    {/each}
  </ul>
</section>
