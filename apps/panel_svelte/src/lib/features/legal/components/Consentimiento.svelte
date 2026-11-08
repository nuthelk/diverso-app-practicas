<script lang="ts">
  import AlertaError from '$lib/shared/ui/AlertaError.svelte';

  /**
   * Casillas de autorización (Ley 1581 de 2012). Deben marcarse de forma
   * expresa: no vienen preseleccionadas y cada una enlaza su documento.
   * Si falta una, quien usa el componente pasa el texto del error de esa casilla.
   */
  let {
    datos = $bindable(false),
    terminos = $bindable(false),
    terminosDoc = 'terminos-agencias',
    errorDatos,
    errorTerminos,
  }: { datos?: boolean; terminos?: boolean; terminosDoc?: string; errorDatos?: string; errorTerminos?: string } = $props();

  const uid = $props.id();
</script>

<fieldset class="space-y-3">
  <legend class="sr-only">Autorizaciones</legend>
  <div>
    <label class="flex cursor-pointer items-start gap-3 text-cuerpo">
      <input
        type="checkbox"
        required
        bind:checked={datos}
        class="mt-0.5 size-5 shrink-0 accent-helecho"
        aria-invalid={errorDatos ? 'true' : undefined}
        aria-describedby={errorDatos ? `${uid}-datos` : undefined}
      />
      <span class="text-tinta-2">
        Autorizo de manera previa, expresa e informada el tratamiento de mis datos personales según la
        <a href="#/legal/privacidad" target="_blank" rel="noopener" class="enlace"
          >política de tratamiento de datos<span class="sr-only"> (se abre en una pestaña nueva)</span></a
        > (Ley 1581 de 2012).
      </span>
    </label>
    {#if errorDatos}<AlertaError id="{uid}-datos" clase="mt-1 ml-8 text-detalle">{errorDatos}</AlertaError>{/if}
  </div>
  <div>
    <label class="flex cursor-pointer items-start gap-3 text-cuerpo">
      <input
        type="checkbox"
        required
        bind:checked={terminos}
        class="mt-0.5 size-5 shrink-0 accent-helecho"
        aria-invalid={errorTerminos ? 'true' : undefined}
        aria-describedby={errorTerminos ? `${uid}-terminos` : undefined}
      />
      <span class="text-tinta-2">
        Acepto los
        <a href={'#/legal/' + terminosDoc} target="_blank" rel="noopener" class="enlace"
          >términos y condiciones<span class="sr-only"> (se abre en una pestaña nueva)</span></a
        >.
      </span>
    </label>
    {#if errorTerminos}<AlertaError id="{uid}-terminos" clase="mt-1 ml-8 text-detalle">{errorTerminos}</AlertaError>{/if}
  </div>
</fieldset>
