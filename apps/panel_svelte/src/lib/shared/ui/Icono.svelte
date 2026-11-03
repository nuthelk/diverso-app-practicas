<script lang="ts">
  /** Ícono de línea decorativo: el texto que lo acompaña (o el `aria-label` del botón) lo nombra. */
  let { trazo, clase = 'size-[18px]' }: { trazo: string; clase?: string } = $props();
</script>

<svg
  class="{clase} shrink-0"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="1.8"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  <path d={trazo} />
</svg>
