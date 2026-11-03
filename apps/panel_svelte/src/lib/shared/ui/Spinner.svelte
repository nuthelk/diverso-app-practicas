<script lang="ts">
  /** Indicador de carga decorativo: quien lo usa pone `role="status"` y el texto accesible. */
  let { clase = '' }: { clase?: string } = $props();
</script>

<div
  class="size-7 animate-spin rounded-full border-2 border-brand-600 border-t-transparent dark:border-brand-300 dark:border-t-transparent {clase}"
  aria-hidden="true"
></div>
