<script lang="ts">
  import type { PlanDraft } from '../../model/plan';
  import Seccion from './Seccion.svelte';

  let { d = $bindable() }: { d: PlanDraft } = $props();
</script>

<Seccion titulo="ITINERARIO">
  <div class="space-y-2">
    {#each d.itinerario as paso, i}
      <div class="flex items-center gap-2">
        <input
          value={paso.hora}
          oninput={(e) => (d.itinerario[i] = { hora: e.currentTarget.value, actividad: paso.actividad })}
          class="campo w-[92px] shrink-0 text-center"
          placeholder="07:00"
        />
        <input
          value={paso.actividad}
          oninput={(e) => (d.itinerario[i] = { hora: paso.hora, actividad: e.currentTarget.value })}
          class="campo"
          placeholder="Actividad"
        />
        <button
          type="button"
          class="grid size-[38px] shrink-0 place-items-center rounded-xl text-slate-400
            transition hover:text-red-600"
          onclick={() => (d.itinerario = d.itinerario.filter((_, j) => j !== i))}
        >
          🗑
        </button>
      </div>
    {/each}
  </div>
  <button
    type="button"
    class="mt-3 rounded-full px-3 py-1.5 text-[13px] font-semibold text-brand-600 transition
      hover:bg-brand-600/10 dark:text-brand-300"
    onclick={() => (d.itinerario = [...d.itinerario, { hora: '', actividad: '' }])}
  >
    + Agregar paso
  </button>
</Seccion>
