<script module lang="ts">
  /** Lo que el control recibe del `Campo`: se esparce sobre el <input>, <textarea> o botón. */
  export interface AtributosCampo {
    id: string;
    'aria-describedby'?: string;
    'aria-invalid'?: 'true';
  }
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import AlertaError from './AlertaError.svelte';

  /**
   * Campo de formulario: etiqueta visible ligada al control, ayuda opcional y error. El control se dibuja en `control`
   * y recibe el `id` y los `aria-*` que lo conectan con su etiqueta, su ayuda y su error.
   */
  let {
    etiqueta,
    ayuda,
    error,
    clase = '',
    control,
  }: {
    etiqueta: string;
    ayuda?: string;
    error?: string;
    clase?: string;
    control: Snippet<[AtributosCampo]>;
  } = $props();

  const uid = $props.id();
  const idAyuda = `${uid}-ayuda`;
  const idError = `${uid}-error`;
  const describedby = $derived([ayuda && idAyuda, error && idError].filter(Boolean).join(' ') || undefined);
</script>

<div class={clase}>
  <label class="etiqueta-campo" for="{uid}-campo">{etiqueta}</label>
  {@render control({ id: `${uid}-campo`, 'aria-describedby': describedby, 'aria-invalid': error ? 'true' : undefined })}
  {#if ayuda}<p id={idAyuda} class="mt-1 text-detalle text-tinta-2">{ayuda}</p>{/if}
  {#if error}<AlertaError id={idError} clase="mt-1 text-detalle">{error}</AlertaError>{/if}
</div>
