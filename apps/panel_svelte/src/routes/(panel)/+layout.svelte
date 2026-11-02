<script lang="ts">
  import type { Snippet } from 'svelte';
  import Shell from '$lib/features/agencias/components/Shell.svelte';

  let { children }: { children: Snippet } = $props();
</script>

<Shell>{@render children()}</Shell>
