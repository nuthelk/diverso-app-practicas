<script lang="ts">
  import Icono from '$lib/shared/ui/Icono.svelte';
  import { ICONOS } from '$lib/shared/ui/iconos';
  import type { PlanDraft } from '../../model/plan';
  import Seccion from './Seccion.svelte';

  let { d = $bindable() }: { d: PlanDraft } = $props();
</script>

<Seccion titulo="Itinerario">
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
          class="grid size-[38px] shrink-0 place-items-center rounded-xl text-suave transition-colors hover:bg-error-ink/10 hover:text-error-ink"
          aria-label="Quitar paso {i + 1}"
          onclick={() => (d.itinerario = d.itinerario.filter((_, j) => j !== i))}
        >
          <Icono trazo={ICONOS.papelera} clase="size-4" />
        </button>
      </div>
    {/each}
  </div>
  <button
    type="button"
    class="btn btn-texto -ml-3 mt-3 text-acento-ink"
    onclick={() => (d.itinerario = [...d.itinerario, { hora: '', actividad: '' }])}
  >
    <Icono trazo={ICONOS.mas} clase="size-4" />
    Agregar paso
  </button>
</Seccion>
