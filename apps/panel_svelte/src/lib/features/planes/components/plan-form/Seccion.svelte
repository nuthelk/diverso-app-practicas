<script lang="ts">
  import type { Snippet } from 'svelte';

  /** Tarjeta con título en versalitas que envuelve cada bloque del formulario de plan. */
  let { titulo, children }: { titulo: string; children: Snippet } = $props();
</script>

<section
  class="rounded-2xl border border-slate-200/80 bg-white p-6
    dark:border-ink-600 dark:bg-ink-800"
>
  <h2 class="mb-4 text-[11.5px] font-bold tracking-[0.12em] text-slate-400">{titulo}</h2>
  {@render children()}
</section>
