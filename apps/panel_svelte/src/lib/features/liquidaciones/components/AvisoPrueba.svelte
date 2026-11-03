<script lang="ts">
  import type { Snippet } from 'svelte';
  import { AVISO_PRUEBA } from '../model/liquidaciones';

  let { children }: { children?: Snippet } = $props();
</script>

<div
  class="rounded-xl bg-orange-500/10 px-4 py-3 text-[12.5px] leading-relaxed text-orange-800 dark:text-orange-300"
  role="note"
>
  <strong class="font-bold">{AVISO_PRUEBA}.</strong>
  {#if children}{@render children()}{/if}
</div>
