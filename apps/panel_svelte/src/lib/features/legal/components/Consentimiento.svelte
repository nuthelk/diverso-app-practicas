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
  <label class="flex cursor-pointer items-start gap-3 text-[15px] leading-relaxed">
    <input
      type="checkbox"
      required
      bind:checked={datos}
      class="mt-1 size-[18px] shrink-0 accent-helecho"
    />
    <span class="text-tinta-2">
      Autorizo de manera previa, expresa e informada el tratamiento de mis datos personales según
      la
      <a href="#/legal/privacidad" target="_blank" rel="noopener"
        class="enlace underline-offset-2"
        >política de tratamiento de datos</a
      > (Ley 1581 de 2012).
    </span>
  </label>
  <label class="flex cursor-pointer items-start gap-3 text-[15px] leading-relaxed">
    <input
      type="checkbox"
      required
      bind:checked={terminos}
      class="mt-1 size-[18px] shrink-0 accent-helecho"
    />
    <span class="text-tinta-2">
      Acepto los
      <a href={'#/legal/' + terminosDoc} target="_blank" rel="noopener"
        class="enlace underline-offset-2"
        >términos y condiciones</a
      >.
    </span>
  </label>
</fieldset>
