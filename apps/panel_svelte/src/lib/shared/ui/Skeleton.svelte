<script lang="ts">
  let { clase = 'h-24 rounded-[18px]' }: { clase?: string } = $props();
</script>

<div class="pulso rounded-[18px] bg-slate-200/70 dark:bg-ink-700 {clase}"></div>
