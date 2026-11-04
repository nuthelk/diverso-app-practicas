<script lang="ts">
  import Logo from './Logo.svelte';

  /** El colibrí sobre el verde del monte, en un cuadro de `tam` px con la esquina «brote» de la marca. */
  let { tam = 36 }: { tam?: number } = $props();
</script>

<div class="rounded-brote flex shrink-0 items-center justify-center bg-bosque text-sobre-bosque" style="width:{tam}px;height:{tam}px">
  <Logo size={Math.round(tam * 0.6)} />
</div>
