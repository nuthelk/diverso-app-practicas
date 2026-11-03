<script lang="ts">
  import type { PageProps } from './$types';
  import Pagina from '$lib/features/liquidaciones/pages/LiquidacionDetallePage.svelte';

  let { params }: PageProps = $props();
</script>

<Pagina id={params.id} />
