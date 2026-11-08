<script lang="ts">
  import type { Snippet } from 'svelte';

  /** Las cifras del período en una sola franja (5 en escritorio, 3 y 2 en pantallas más angostas), separadas por líneas finas. */
  let { columnas = 5, children }: { columnas?: number; children: Snippet } = $props();
</script>

<dl class="franja" style:--franja-columnas={columnas}>{@render children()}</dl>
