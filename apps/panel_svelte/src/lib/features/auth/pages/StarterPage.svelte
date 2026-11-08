<script lang="ts">
  import Logo from '$lib/shared/ui/Logo.svelte';
  import Spinner from '$lib/shared/ui/Spinner.svelte';
  import AlertaError from '$lib/shared/ui/AlertaError.svelte';
  import { auth, perfilActual, signOut } from '../model/auth.svelte';
  import { goto } from '$app/navigation';
  import { miAgencia } from '$lib/features/agencias/api/agencias.api';
  import { consentimientosPendientes } from '$lib/features/legal/api/legal.api';
  import { mensajeError } from '$lib/shared/api/errores';

  let fallo = $state('');
  let intento = $state(0);

  // Decisión de destino: admin → /admin; agencia sin registro → /onboarding.
  $effect(() => {
    void intento;
    if (!auth.ready || !auth.userId) return;
    fallo = '';
    (async () => {
      try {
        const perfil = await perfilActual();
        if (perfil.rol === 'admin') return goto('#/admin');
        const agencia = await miAgencia();
        if (!agencia) return goto('#/onboarding'); // el registro incluye la autorización
        const pendientes = await consentimientosPendientes();
        goto(pendientes.length > 0 ? '#/consentimiento' : '#/dashboard');
      } catch (e) {
        // Mandar a /login con sesión abierta rebota otra vez aquí: se avisa y se deja elegir.
        fallo = mensajeError(e);
      }
    })();
  });
</script>

<main class="grid min-h-screen place-items-center px-6 py-12">
  <div class="aparecer flex w-full max-w-sm flex-col items-center gap-4 text-center">
    <Logo size={40} clase="text-helecho" />
    {#if fallo}
      <h1 class="text-seccion">No pudimos abrir tu panel</h1>
      <AlertaError clase="text-left">{fallo}</AlertaError>
      <div class="flex flex-wrap justify-center gap-2">
        <button type="button" class="btn btn-primario" onclick={() => intento++}>Reintentar</button>
        <button type="button" class="btn btn-secundario" onclick={() => signOut()}>Cerrar sesión</button>
      </div>
    {:else}
      <div role="status" class="flex flex-col items-center gap-3">
        <Spinner />
        <h1 class="text-seccion">Preparando tu panel…</h1>
        <p class="text-cuerpo text-tinta-2">Estamos revisando tu cuenta y tu agencia.</p>
      </div>
    {/if}
  </div>
</main>
