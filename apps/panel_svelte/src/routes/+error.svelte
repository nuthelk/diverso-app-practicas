<script lang="ts">
  import { page } from '$app/state';
</script>

<div class="p-10 text-slate-500">
  {#if page.status === 404}
    No encontramos esta sección.
  {:else}
    {page.error?.message}
  {/if}
  <a class="font-semibold text-brand-600 hover:underline" href="#/dashboard">Volver al resumen</a>
</div>
