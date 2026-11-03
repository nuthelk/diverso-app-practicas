<script lang="ts">
  /**
   * Casillas de autorización (Ley 1581 de 2012). Deben marcarse de forma
   * expresa: no vienen preseleccionadas y cada una enlaza su documento.
   */
  let {
    datos = $bindable(false),
    terminos = $bindable(false),
    terminosDoc = 'terminos-agencias',
  }: { datos?: boolean; terminos?: boolean; terminosDoc?: string } = $props();
</script>

<fieldset class="space-y-2.5">
  <legend class="sr-only">Autorizaciones</legend>
  <label class="flex cursor-pointer items-start gap-3 text-[13px] leading-relaxed">
    <input
      type="checkbox"
      required
      bind:checked={datos}
      class="mt-0.5 size-4 shrink-0 accent-brand-600"
    />
    <span class="text-suave">
      Autorizo de manera previa, expresa e informada el tratamiento de mis datos personales según
      la
      <a href="#/legal/privacidad" target="_blank" rel="noopener"
        class="enlace underline-offset-2"
        >política de tratamiento de datos</a
      > (Ley 1581 de 2012).
    </span>
  </label>
  <label class="flex cursor-pointer items-start gap-3 text-[13px] leading-relaxed">
    <input
      type="checkbox"
      required
      bind:checked={terminos}
      class="mt-0.5 size-4 shrink-0 accent-brand-600"
    />
    <span class="text-suave">
      Acepto los
      <a href={'#/legal/' + terminosDoc} target="_blank" rel="noopener"
        class="enlace underline-offset-2"
        >términos y condiciones</a
      >.
    </span>
  </label>
</fieldset>
