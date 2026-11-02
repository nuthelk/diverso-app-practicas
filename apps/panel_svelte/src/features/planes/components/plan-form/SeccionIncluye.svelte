<script lang="ts">
  import { agregarIncluye, type PlanDraft } from '../../plan';
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

<Seccion titulo="QUÉ INCLUYE · PRECIO FINAL SIN SORPRESAS">
  <div class="flex flex-wrap gap-5">
    <label class="flex items-center gap-2 text-[13.5px] font-medium">
      <input type="checkbox" bind:checked={d.incluyeTransporte} class="switch" /> Transporte
    </label>
    <label class="flex items-center gap-2 text-[13.5px] font-medium">
      <input type="checkbox" bind:checked={d.incluyeComida} class="switch" /> Comida
    </label>
    <label class="flex items-center gap-2 text-[13.5px] font-medium">
      <input type="checkbox" bind:checked={d.incluyeHospedaje} class="switch" /> Hospedaje
    </label>
  </div>
  {#if d.incluye.length > 0}
    <div class="mt-3 flex flex-wrap gap-2">
      {#each d.incluye as item, i (item)}
        <span
          class="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-[12.5px]
            font-medium dark:bg-ink-700"
        >
          {item}
          <button
            type="button"
            class="text-slate-400 hover:text-red-600"
            onclick={() => (d.incluye = d.incluye.filter((_, j) => j !== i))}
          >
            ✕</button
          >
        </span>
      {/each}
    </div>
  {/if}
  <div class="mt-3 flex gap-2">
    <input
      bind:value={nuevoIncluye}
      class="campo"
      placeholder="Otro ítem (ej. Guía certificado)"
      onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), agregar())}
    />
    <button
      type="button"
      class="grid size-[42px] shrink-0 place-items-center rounded-xl border border-slate-200
        text-slate-500 transition hover:bg-slate-100 dark:border-ink-600 dark:hover:bg-ink-700"
      onclick={agregar}
    >
      +
    </button>
  </div>
</Seccion>
