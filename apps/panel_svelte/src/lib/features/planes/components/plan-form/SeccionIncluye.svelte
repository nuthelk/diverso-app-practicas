<script lang="ts">
  import Icono from '$lib/shared/ui/Icono.svelte';
  import { ICONOS } from '$lib/shared/ui/iconos';
  import { agregarIncluye, type PlanDraft } from '../../model/plan';
  import Seccion from './Seccion.svelte';

  /** Interruptores de transporte/comida/hospedaje y la lista de ítems extra que incluye el plan. */
  let { d = $bindable() }: { d: PlanDraft } = $props();

  let nuevoIncluye = $state('');

  function agregar() {
    const lista = agregarIncluye(d.incluye, nuevoIncluye);
    if (lista) {
      d.incluye = lista;
      nuevoIncluye = '';
    }
  }
</script>

<Seccion titulo="Qué incluye · precio final sin sorpresas">
  <div class="flex flex-wrap gap-x-6 gap-y-3">
    {#each [['incluyeTransporte', 'Transporte'], ['incluyeComida', 'Comida'], ['incluyeHospedaje', 'Hospedaje']] as const as [campo, etiqueta]}
      <label class="flex items-center gap-2.5 text-[13.5px] font-medium">
        <input type="checkbox" bind:checked={d[campo]} class="switch" />
        {etiqueta}
      </label>
    {/each}
  </div>
  {#if d.incluye.length > 0}
    <ul class="mt-4 flex flex-wrap gap-2">
      {#each d.incluye as item, i (item)}
        <li class="inline-flex items-center gap-1 rounded-full bg-brand-600/10 py-1 pr-1.5 pl-3 text-[12.5px] font-medium text-acento-ink dark:bg-brand-400/15">
          {item}
          <button
            type="button"
            class="grid size-5 place-items-center rounded-full hover:bg-error-ink/10 hover:text-error-ink"
            aria-label="Quitar {item}"
            onclick={() => (d.incluye = d.incluye.filter((_, j) => j !== i))}
          >
            <Icono trazo={ICONOS.cerrar} clase="size-3" />
          </button>
        </li>
      {/each}
    </ul>
  {/if}
  <div class="mt-4 flex gap-2">
    <input
      bind:value={nuevoIncluye}
      class="campo"
      placeholder="Otro ítem (ej. Guía certificado)"
      aria-label="Otro ítem que incluye el plan"
      onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), agregar())}
    />
    <button type="button" class="boton-icono size-[42px] rounded-xl" aria-label="Agregar ítem" onclick={agregar}>
      <Icono trazo={ICONOS.mas} clase="size-4" />
    </button>
  </div>
</Seccion>
