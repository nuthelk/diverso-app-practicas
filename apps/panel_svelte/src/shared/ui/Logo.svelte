<script lang="ts">
  /** Colibrí de Diverso: la máscara de la app Flutter teñida con `currentColor`. */
  let { size = 22, clase = '' }: { size?: number; clase?: string } = $props();
</script>

<span
  class="inline-block shrink-0 {clase}"
  style="width: {size}px; height: {size}px; background-color: currentColor;
    -webkit-mask: url(/logo_diverso.png) center / contain no-repeat;
    mask: url(/logo_diverso.png) center / contain no-repeat;"
  aria-hidden="true"
></span>
