<script lang="ts">
  import { toast } from '$lib/shared/lib/toast.svelte';
</script>

{#if toast.mensaje}
  <div
    class="aparecer fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-tinta px-5 py-2.5
      text-[15px] font-semibold text-niebla shadow-xl"
    role="status"
  >
    {toast.mensaje}
  </div>
{/if}
