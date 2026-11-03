<script lang="ts">
  import Icono from '$lib/shared/ui/Icono.svelte';
  import { ICONOS } from '$lib/shared/ui/iconos';
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
  <ul class="flex flex-wrap gap-2">
    {#each fotos as f, i (f)}
      <li class="inline-flex max-w-full items-center gap-1 rounded-full bg-brand-600/10 py-1 pr-1.5 pl-3 text-[11.5px] text-acento-ink sm:max-w-[320px] dark:bg-brand-400/15">
        <span class="truncate">{f}</span>
        <button
          type="button"
          class="grid size-5 shrink-0 place-items-center rounded-full hover:bg-error-ink/10 hover:text-error-ink"
          aria-label="Quitar foto {i + 1}"
          onclick={() => (fotos = fotos.filter((_, j) => j !== i))}
        >
          <Icono trazo={ICONOS.cerrar} clase="size-3" />
        </button>
      </li>
    {/each}
  </ul>
{/if}
<div class="flex gap-2">
  <input
    bind:value={nuevaFoto}
    class="campo"
    placeholder="URL de foto (https://…)"
    aria-label="URL de una foto del plan"
    onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), agregar())}
  />
  <button type="button" class="boton-icono size-[42px] rounded-xl" aria-label="Agregar foto" onclick={agregar}>
    <Icono trazo={ICONOS.mas} clase="size-4" />
  </button>
</div>
