<script lang="ts">
  import type { PlanDraft } from '../../plan';
  import type { ErroresPolitica } from '../../politica';

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

<div
  class="space-y-3 rounded-xl border border-slate-200/80 bg-paper p-4 dark:border-ink-600 dark:bg-ink-900"
  role="group"
  aria-label="Política de cancelación"
>
  <h3 class="text-[13px] font-bold">Política de cancelación y reembolsos</h3>
  <p class="text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">
    Las horas se cuentan hacia atrás desde la fecha del plan y su hora de salida. Con estos
    números se calcula el reembolso al cancelar y se escribe el texto que ve el viajero.
  </p>
  <div class="grid gap-3 min-[640px]:grid-cols-3">
    <label class="block">
      <span class="etiqueta">Cancelación gratuita hasta (horas antes) *</span>
      <input
        type="number"
        min="1"
        step="1"
        required
        bind:value={d.horasCancelacionGratuita}
        class="campo"
        aria-invalid={intentado && !!errores.horasGratis}
      />
      {#if intentado && errores.horasGratis}
        <span class="mt-1 block text-[12px] text-red-600" role="alert">{errores.horasGratis}</span>
      {/if}
    </label>
    <label class="block">
      <span class="etiqueta">Reembolso parcial hasta (horas antes)</span>
      <input
        type="number"
        min="0"
        step="1"
        bind:value={d.horasReembolsoParcial}
        class="campo"
        placeholder="Opcional"
        aria-invalid={intentado && !!errores.horasParcial}
      />
      {#if intentado && errores.horasParcial}
        <span class="mt-1 block text-[12px] text-red-600" role="alert">{errores.horasParcial}</span>
      {/if}
    </label>
    <label class="block">
      <span class="etiqueta">Porcentaje de reembolso parcial (1–99)</span>
      <input
        type="number"
        min="1"
        max="99"
        step="1"
        bind:value={d.porcentajeReembolsoParcial}
        class="campo"
        placeholder="Opcional"
        aria-invalid={intentado && !!errores.porcentajeParcial}
      />
      {#if intentado && errores.porcentajeParcial}
        <span class="mt-1 block text-[12px] text-red-600" role="alert">{errores.porcentajeParcial}</span>
      {/if}
    </label>
  </div>
  <label class="block">
    <span class="etiqueta">Notas de la política (opcional)</span>
    <textarea
      rows="2"
      bind:value={d.politicaNotas}
      class="campo resize-none"
      placeholder="Ej.: Avisar restricciones alimentarias."
      aria-invalid={intentado && !!errores.notas}
    ></textarea>
    <span class="mt-1 block text-[12px] text-slate-500 dark:text-slate-400">
      Frases que no cambian el reembolso: se muestran al viajero después de la política.
    </span>
    {#if intentado && errores.notas}
      <span class="mt-1 block text-[12px] text-red-600" role="alert">{errores.notas}</span>
    {/if}
  </label>
  <p class="text-[13px] leading-relaxed" data-testid="politica-texto">
    <span class="font-semibold">Lo que verá el viajero:</span>
    {textoVistaPrevia}
  </p>
</div>
