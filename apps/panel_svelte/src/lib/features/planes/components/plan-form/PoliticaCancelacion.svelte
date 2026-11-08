<script lang="ts">
  import Campo from '$lib/shared/ui/Campo.svelte';
  import type { PlanDraft } from '../../model/plan';
  import type { ErroresPolitica } from '../../model/politica';

  /** Horas y porcentajes de la política, sus errores (solo tras intentar guardar) y el texto que leerá el viajero. */
  let {
    d = $bindable(),
    errores,
    intentado,
    textoVistaPrevia,
  }: {
    d: PlanDraft;
    errores: ErroresPolitica;
    intentado: boolean;
    textoVistaPrevia: string;
  } = $props();
</script>

<div class="space-y-3 rounded-hoja-chica border border-linea bg-niebla p-4" role="group" aria-label="Política de cancelación">
  <h3 class="text-destacado">Política de cancelación y reembolsos</h3>
  <p class="text-tinta-2">
    Las horas se cuentan hacia atrás desde la fecha del plan y su hora de salida. Con estos
    números se calcula el reembolso al cancelar y se escribe el texto que ve el viajero.
  </p>
  <div class="grid gap-3 min-[640px]:grid-cols-3">
    <Campo etiqueta="Cancelación gratuita hasta (horas antes) *" error={intentado ? errores.horasGratis : undefined}>
      {#snippet control(atributos)}
        <input {...atributos} data-campo="horasGratis" type="number" min="1" step="1" required bind:value={d.horasCancelacionGratuita} class="campo" />
      {/snippet}
    </Campo>
    <Campo etiqueta="Reembolso parcial hasta (horas antes)" error={intentado ? errores.horasParcial : undefined}>
      {#snippet control(atributos)}
        <input
          {...atributos}
          data-campo="horasParcial"
          type="number"
          min="0"
          step="1"
          bind:value={d.horasReembolsoParcial}
          class="campo"
          placeholder="Opcional"
        />
      {/snippet}
    </Campo>
    <Campo etiqueta="Porcentaje de reembolso parcial (1–99)" error={intentado ? errores.porcentajeParcial : undefined}>
      {#snippet control(atributos)}
        <input
          {...atributos}
          data-campo="porcentajeParcial"
          type="number"
          min="1"
          max="99"
          step="1"
          bind:value={d.porcentajeReembolsoParcial}
          class="campo"
          placeholder="Opcional"
        />
      {/snippet}
    </Campo>
  </div>
  <Campo
    etiqueta="Notas de la política (opcional)"
    ayuda="Frases que no cambian el reembolso: se muestran al viajero después de la política."
    error={intentado ? errores.notas : undefined}
  >
    {#snippet control(atributos)}
      <textarea
        {...atributos}
        data-campo="notas"
        rows="2"
        bind:value={d.politicaNotas}
        class="campo resize-none"
        placeholder="Ej.: Avisar restricciones alimentarias."
      ></textarea>
    {/snippet}
  </Campo>
  <p data-testid="politica-texto">
    <span class="font-semibold">Lo que verá el viajero:</span>
    {textoVistaPrevia}
  </p>
</div>
