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
          class="campo cifra w-[96px] shrink-0 text-center text-[17px]"
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
          class="grid size-11 shrink-0 place-items-center rounded-full text-tinta-2 transition-colors hover:bg-heliconia-bg hover:text-heliconia"
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
    class="btn btn-texto -ml-3 mt-3 text-helecho"
    onclick={() => (d.itinerario = [...d.itinerario, { hora: '', actividad: '' }])}
  >
    <Icono trazo={ICONOS.mas} clase="size-4" />
    Agregar paso
  </button>
</Seccion>
