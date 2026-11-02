<script lang="ts">
  import type { PageProps } from './$types';
  import Pagina from '$lib/features/legal/LegalPage.svelte';

  let { params }: PageProps = $props();
</script>

<Pagina doc={params.doc ?? ''} />
