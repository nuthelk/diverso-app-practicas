<script lang="ts">
  import Campo from '$lib/shared/ui/Campo.svelte';
  import type { PlanDraft } from '../../model/plan';
  import Seccion from './Seccion.svelte';

  let { d = $bindable() }: { d: PlanDraft } = $props();
</script>

<Seccion titulo="Resumen y descripción">
  <div class="space-y-3">
    <Campo etiqueta="Resumen corto">
      {#snippet control(atributos)}
        <input {...atributos} bind:value={d.resumen} class="campo" placeholder="Una frase que venda el plan" />
      {/snippet}
    </Campo>
    <Campo etiqueta="Descripción completa">
      {#snippet control(atributos)}
        <textarea {...atributos} rows="4" bind:value={d.descripcion} class="campo resize-none"></textarea>
      {/snippet}
    </Campo>
  </div>
</Seccion>
