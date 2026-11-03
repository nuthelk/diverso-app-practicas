<script lang="ts">
  import type { PlanDraft } from '../../model/plan';
  import Seccion from './Seccion.svelte';

  let { d = $bindable() }: { d: PlanDraft } = $props();
</script>

<Seccion titulo="Resumen y descripción">
  <div class="space-y-3">
    <label class="block">
      <span class="etiqueta-campo">Resumen corto</span>
      <input bind:value={d.resumen} class="campo" placeholder="Una frase que venda el plan" />
    </label>
    <label class="block">
      <span class="etiqueta-campo">Descripción completa</span>
      <textarea rows="4" bind:value={d.descripcion} class="campo resize-none"></textarea>
    </label>
  </div>
</Seccion>
