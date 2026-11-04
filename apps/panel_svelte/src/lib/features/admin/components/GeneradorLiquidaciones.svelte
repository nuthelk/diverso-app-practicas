<script lang="ts">
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

<section class="tarjeta mt-7 p-5" aria-label="Generar liquidaciones">
  <div class="flex flex-wrap items-end gap-4">
    <label class="block">
      <span class="etiqueta-campo">Semana a liquidar (cualquier día de ella)</span>
      <input type="date" class="campo cifra w-[200px] text-[17px]" bind:value={semana} />
    </label>
    <button class="btn btn-primario" disabled={generando || !semanaLista} onclick={ongenerarsemana}>
      {generando ? 'Generando…' : 'Generar liquidaciones de la semana'}
    </button>
    <button class="btn btn-secundario" disabled={generando} onclick={onanticipos}>Generar anticipos ahora</button>
  </div>
  {#if rango}
    <p class="mt-3 text-[15px] text-tinta-2">
      Semana del lunes {fechaTexto(rango.inicio)} al domingo {fechaTexto(rango.fin)}.
      {#if !semanaLista}
        <span class="font-bold text-prueba-ink">Aún no termina: solo se liquidan semanas completas.</span>
      {/if}
    </p>
  {/if}
</section>
