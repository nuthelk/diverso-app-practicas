<script lang="ts">
  import type { PageProps } from './$types';
  import Pagina from '$lib/features/planes/PlanFormPage.svelte';

  let { params }: PageProps = $props();
</script>

<Pagina planId={params.id} />
