<script lang="ts">
  import { toast } from '$lib/shared/lib/toast.svelte';
</script>

{#if toast.mensaje}
  <div
    class="aparecer fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-slate-900 px-5 py-2.5
      text-[13px] font-semibold text-white shadow-xl dark:bg-slate-100 dark:text-slate-900"
    role="status"
  >
    {toast.mensaje}
  </div>
{/if}
