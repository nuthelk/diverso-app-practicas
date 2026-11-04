<script lang="ts">
  import { page } from '$app/state';
  import Curvas from '$lib/shared/ui/Curvas.svelte';
  import MarcaTile from '$lib/shared/ui/MarcaTile.svelte';
</script>

<div class="relative grid min-h-screen place-items-center overflow-hidden px-6 py-12">
  <Curvas clase="top-1/2 left-1/2 h-[420px] w-[840px] max-w-none -translate-x-1/2 -translate-y-1/2 text-musgo opacity-25" />
  <div class="aparecer relative flex max-w-md flex-col items-center text-center">
    <MarcaTile tam={56} />
    <h1 class="mt-6 text-[30px] leading-[1.15] text-balance sm:text-[34px]">
      {#if page.status === 404}
        No encontramos esta sección.
      {:else}
        {page.error?.message}
      {/if}
    </h1>
    <a class="btn btn-primario mt-7" href="#/dashboard">Volver al resumen</a>
  </div>
</div>
