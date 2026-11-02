<script lang="ts">
  import type { Snippet } from 'svelte';
  import '../app.css';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { auth } from '$lib/features/auth/auth.svelte';
  import { redireccionSesion } from '$lib/features/auth/sesion';
  import { rutaActual } from '$lib/shared/lib/ruta';
  import Toast from '$lib/shared/ui/Toast.svelte';

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
    <div class="size-7 animate-spin rounded-full border-2 border-brand-600 border-t-transparent"></div>
  </div>
{:else}
  {@render children()}
{/if}

<Toast />
