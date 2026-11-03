<script lang="ts">
  import { agregarFoto } from '../../model/plan';

  /** Fotos del plan como URLs: chips con las ya cargadas y un campo para sumar otra. */
  let { fotos = $bindable() }: { fotos: string[] } = $props();

  let nuevaFoto = $state('');

  function agregar() {
    const lista = agregarFoto(fotos, nuevaFoto);
    if (lista) {
      fotos = lista;
      nuevaFoto = '';
    }
  }
</script>

{#if fotos.length > 0}
  <div class="flex flex-wrap gap-2">
    {#each fotos as f, i (f)}
      <span
        class="inline-flex max-w-[320px] items-center gap-1.5 rounded-full bg-slate-100 px-3
          py-1 text-[11.5px] dark:bg-ink-700"
      >
        <span class="truncate">{f}</span>
        <button
          type="button"
          class="text-slate-400 hover:text-red-600"
          onclick={() => (fotos = fotos.filter((_, j) => j !== i))}
        >
          ✕</button
        >
      </span>
    {/each}
  </div>
{/if}
<div class="flex gap-2">
  <input
    bind:value={nuevaFoto}
    class="campo"
    placeholder="URL de foto (https://…)"
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
