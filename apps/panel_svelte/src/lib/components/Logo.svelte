<script lang="ts">
  /** Golondrina de Diverso (misma silueta Bézier que la app Flutter). */
  let { size = 22, clase = '' }: { size?: number; clase?: string } = $props();
</script>

<svg width={size} height={size} viewBox="0 0 108 108" fill="none" class={clase} aria-hidden="true">
  <g transform="translate(20.52 20.52) scale(0.62)">
    <path
      d="M98,50 C86,42 78,30 68,31 C62,32 59,37 58,43 C49,31 37,18 29,13 C34,32 42,44 48,54 C34,62 20,74 12,86 C21,82 29,74 34,67 C26,77 19,87 15,96 C32,82 48,70 62,61 C67,57 70,54 72,51 C82,50 91,50 98,50 Z"
      fill="currentColor"
    />
  </g>
</svg>
