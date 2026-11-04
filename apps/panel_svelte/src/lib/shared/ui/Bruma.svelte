<script lang="ts">
  /** Velo de niebla decorativo: un degradado suave del token `--bruma` sobre la esquina que lo reciba. */
  let { clase = '' }: { clase?: string } = $props();
</script>

<div
  class="pointer-events-none absolute inset-0 {clase}"
  style="background: radial-gradient(ellipse 60% 120% at 78% 0%, var(--bruma), transparent 70%)"
  aria-hidden="true"
></div>
