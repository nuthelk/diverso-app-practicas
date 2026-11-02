<script lang="ts">
  let { iniciales, tam = 34 }: { iniciales: string; tam?: number } = $props();

  const letras = $derived(
    iniciales
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]!.toUpperCase())
      .join('') || '?',
  );
</script>

<div
  class="flex shrink-0 items-center justify-center rounded-full bg-ok-500/15 font-bold text-ok-600 dark:text-ok-500"
  style="width:{tam}px;height:{tam}px;font-size:{tam * 0.36}px"
>{letras}</div
>
