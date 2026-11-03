<script lang="ts">
  import type { PlanDraft } from '../../model/plan';
  import Seccion from './Seccion.svelte';

  let { d = $bindable() }: { d: PlanDraft } = $props();
</script>

<Seccion titulo="RESUMEN Y DESCRIPCIÓN">
  <div class="space-y-3">
    <label class="block">
      <span class="etiqueta">Resumen corto</span>
      <input bind:value={d.resumen} class="campo" placeholder="Una frase que venda el plan" />
    </label>
    <label class="block">
      <span class="etiqueta">Descripción completa</span>
      <textarea rows="4" bind:value={d.descripcion} class="campo resize-none"></textarea>
    </label>
  </div>
</Seccion>
