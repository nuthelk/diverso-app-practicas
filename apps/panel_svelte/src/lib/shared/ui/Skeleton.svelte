<script lang="ts">
  let { clase = 'h-24 rounded-2xl' }: { clase?: string } = $props();
</script>

<div class="pulso rounded-2xl bg-slate-200/70 dark:bg-ink-700 {clase}"></div>
