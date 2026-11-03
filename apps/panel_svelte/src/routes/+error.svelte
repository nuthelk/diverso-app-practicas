<script lang="ts">
  import { page } from '$app/state';
  import MarcaTile from '$lib/shared/ui/MarcaTile.svelte';
</script>

<div class="grid min-h-screen place-items-center px-6 py-12">
  <div class="aparecer flex max-w-sm flex-col items-center text-center">
    <MarcaTile tam={48} />
    <h1 class="mt-5 text-[20px] leading-snug font-extrabold tracking-tight">
      {#if page.status === 404}
        No encontramos esta sección.
      {:else}
        {page.error?.message}
      {/if}
    </h1>
    <a class="btn btn-primario mt-6" href="#/dashboard">Volver al resumen</a>
  </div>
</div>
