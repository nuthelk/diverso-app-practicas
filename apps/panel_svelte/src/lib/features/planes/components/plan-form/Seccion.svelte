<script lang="ts">
  import type { Snippet } from 'svelte';
  import Tarjeta from '$lib/shared/ui/Tarjeta.svelte';

  /** Tarjeta con título que envuelve cada bloque del formulario de plan. */
  let { titulo, children }: { titulo: string; children: Snippet } = $props();
</script>

<Tarjeta {titulo}>{@render children()}</Tarjeta>
