<script lang="ts">
  import { untrack, type Snippet } from 'svelte';
  import '../app.css';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { auth } from '$lib/features/auth/model/auth.svelte';
  import { redireccionSesion } from '$lib/features/auth/model/sesion';
  import { rutaActual } from '$lib/shared/lib/ruta';
  import { iniciarTema } from '$lib/shared/lib/tema.svelte';
  import Toast from '$lib/shared/ui/Toast.svelte';
  import DialogoConfirmar from '$lib/shared/ui/DialogoConfirmar.svelte';
  import Spinner from '$lib/shared/ui/Spinner.svelte';

  let { children }: { children: Snippet } = $props();

  // El tema (Sistema / Claro / Oscuro) vale para todo el panel, también login y admin.
  // `untrack`: iniciarTema lee el modelo del tema al aplicarlo y no debe reiniciarse cada vez que la persona elige uno.
  $effect(() => untrack(iniciarTema));

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
<DialogoConfirmar />
