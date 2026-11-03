<script lang="ts">
  import type { Snippet } from 'svelte';
  import Aviso from '$lib/shared/ui/Aviso.svelte';
  import { AVISO_PRUEBA } from '../model/liquidaciones';

  let { children }: { children?: Snippet } = $props();
</script>

<Aviso role="note">
  <strong class="font-bold">{AVISO_PRUEBA}.</strong>
  {#if children}{@render children()}{/if}
</Aviso>
