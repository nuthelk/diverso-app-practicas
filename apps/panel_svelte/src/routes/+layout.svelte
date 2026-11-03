<script lang="ts">
  import type { Snippet } from 'svelte';
  import '../app.css';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { auth } from '$lib/features/auth/model/auth.svelte';
  import { redireccionSesion } from '$lib/features/auth/model/sesion';
  import { rutaActual } from '$lib/shared/lib/ruta';
  import Toast from '$lib/shared/ui/Toast.svelte';
  import Spinner from '$lib/shared/ui/Spinner.svelte';

  let { children }: { children: Snippet } = $props();

  // Guards de sesión: la decisión vive en sesion.ts.
  $effect(() => {
    if (!auth.ready) return;
    const destino = redireccionSesion(rutaActual(page.url), auth.userId);
    if (destino) goto('#' + destino);
  });
</script>

{#if !auth.ready}
  <div class="grid min-h-screen place-items-center" role="status" aria-label="Cargando">
    <Spinner />
  </div>
{:else}
  {@render children()}
{/if}

<Toast />
