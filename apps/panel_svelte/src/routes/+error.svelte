<script lang="ts">
  import { page } from '$app/state';
  import { auth } from '$lib/features/auth/model/auth.svelte';
  import { mensajeError } from '$lib/shared/api/errores';
  import Logo from '$lib/shared/ui/Logo.svelte';

  const noExiste = $derived(page.status === 404);
  const conSesion = $derived(!!auth.userId);

  // SvelteKit pone «Internal Error» cuando no hay otro texto: no le dice nada a quien lo lee.
  const mensaje = $derived.by(() => {
    if (noExiste) return 'La dirección no existe o cambió de lugar. Revisa que esté bien escrita o vuelve al inicio.';
    const crudo = page.error?.message;
    if (!crudo || crudo === 'Internal Error') return 'Ocurrió un error inesperado. Intenta de nuevo; si sigue pasando, vuelve al inicio.';
    return mensajeError(page.error);
  });
</script>

<main class="grid min-h-screen place-items-center px-6 py-12">
  <div class="aparecer flex max-w-md flex-col items-center text-center">
    <Logo size={40} clase="text-helecho" />
    <p class="etiqueta-seccion mt-5">Error {page.status}</p>
    <h1 class="mt-2 text-pagina text-balance">{noExiste ? 'No encontramos esta página' : 'Algo salió mal'}</h1>
    <p class="mt-3 text-cuerpo text-tinta-2">{mensaje}</p>
    <div class="mt-7 flex flex-wrap justify-center gap-2">
      {#if conSesion}
        <a class="btn btn-primario" href="#/dashboard">Ir al resumen</a>
      {:else}
        <a class="btn btn-primario" href="#/login">Iniciar sesión</a>
      {/if}
      {#if !noExiste}
        <button type="button" class="btn btn-secundario" onclick={() => location.reload()}>Reintentar</button>
      {/if}
    </div>
  </div>
</main>
