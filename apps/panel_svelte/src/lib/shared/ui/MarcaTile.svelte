<script lang="ts">
  import Logo from './Logo.svelte';

  /** El colibrí sobre el azul de la marca, en un cuadro de `tam` px con esquinas proporcionales. */
  let { tam = 36 }: { tam?: number } = $props();
</script>

<div
  class="flex shrink-0 items-center justify-center bg-brand-600 text-white"
  style="width:{tam}px;height:{tam}px;border-radius:{Math.round(tam * 0.33)}px"
>
  <Logo size={Math.round(tam * 0.6)} />
</div>
