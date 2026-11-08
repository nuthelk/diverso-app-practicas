<script lang="ts">
  import Tarjeta from '$lib/shared/ui/Tarjeta.svelte';
  import Campo from '$lib/shared/ui/Campo.svelte';
  import { fechaTexto } from '$lib/shared/lib/format';
  import { rangoSemana, semanaTerminada } from '$lib/features/liquidaciones/model/liquidaciones';

  let {
    semana = $bindable(),
    generando,
    ongenerarsemana,
    onanticipos,
  }: {
    semana: string;
    generando: boolean;
    ongenerarsemana: () => void;
    onanticipos: () => void;
  } = $props();

  const rango = $derived(semana ? rangoSemana(semana) : null);
  const semanaLista = $derived(!!semana && semanaTerminada(semana));
</script>

<Tarjeta
  titulo="Generar a mano"
  descripcion="Elige cualquier día de la semana que quieras liquidar. Solo se liquidan semanas completas."
  clase="mt-6"
>
  <div class="flex flex-wrap items-end gap-3">
    <Campo etiqueta="Semana a liquidar" clase="w-full sm:w-56">
      {#snippet control(atributos)}
        <input {...atributos} type="date" class="campo" bind:value={semana} />
      {/snippet}
    </Campo>
    <button class="btn btn-primario" disabled={generando || !semanaLista} onclick={ongenerarsemana}>
      {generando ? 'Generando…' : 'Generar liquidaciones de la semana'}
    </button>
    <button class="btn btn-secundario" disabled={generando} onclick={onanticipos}>Generar anticipos ahora</button>
  </div>
  {#if rango}
    <p class="mt-3 text-detalle text-tinta-2">
      Semana del lunes {fechaTexto(rango.inicio)} al domingo {fechaTexto(rango.fin)}.
      {#if !semanaLista}
        <span class="font-bold text-prueba-ink">Aún no termina: solo se liquidan semanas completas.</span>
      {/if}
    </p>
  {/if}
</Tarjeta>
