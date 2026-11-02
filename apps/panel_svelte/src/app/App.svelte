<script lang="ts">
  import { auth } from '@/features/auth/auth.svelte';
  import { router, go } from '@/shared/lib/router.svelte';
  import Shell from './Shell.svelte';
  import Toast from './Toast.svelte';
  import { resolverRuta } from './rutas';
  import { redireccionSesion } from './sesion';

  const ruta = $derived(resolverRuta(router.path));

  // Guards de sesión: la decisión vive en sesion.ts.
  $effect(() => {
    if (!auth.ready) return;
    const destino = redireccionSesion(router.path, auth.userId);
    if (destino) go(destino);
  });
</script>

{#snippet pagina()}
  {#if ruta.componente}
    {@const Pagina = ruta.componente}
    <!-- /planes/nuevo y /planes/editar/x usan la misma página: cada ruta monta su propia instancia. -->
    {#key ruta.patron}
      <Pagina {...ruta.props} />
    {/key}
  {:else}
    <div class="p-10 text-slate-500">
      No encontramos esta sección. <a class="font-semibold text-brand-600 hover:underline" href="#/dashboard">Volver al resumen</a>
    </div>
  {/if}
{/snippet}

{#if !auth.ready}
  <div class="grid min-h-screen place-items-center" role="status" aria-label="Cargando">
    <div class="size-7 animate-spin rounded-full border-2 border-brand-600 border-t-transparent"></div>
  </div>
{:else if ruta.layout === 'panel'}
  <Shell>{@render pagina()}</Shell>
{:else}
  {@render pagina()}
{/if}

<Toast />
