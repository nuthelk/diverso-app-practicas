<script lang="ts">
  import Logo from '$lib/shared/ui/Logo.svelte';
  import Consentimiento from './components/Consentimiento.svelte';
  import { consentimientosPendientes, registrarConsentimiento } from './legal.api';
import { mensajeError } from '$lib/shared/api/errores';
  import { signOut } from '$lib/features/auth/auth.svelte';
  import { goto } from '$app/navigation';

  // Se llega aquí cuando la cuenta no tiene aceptada la versión vigente
  // (cuentas creadas antes de la v1 o cambio de versión de los documentos).
  let datos = $state(false);
  let terminos = $state(false);
  let guardando = $state(false);
  let error = $state('');

  async function aceptar(e: SubmitEvent) {
    e.preventDefault();
    guardando = true;
    error = '';
    try {
      const pendientes = await consentimientosPendientes();
      for (const tipo of pendientes) await registrarConsentimiento(tipo);
      goto('#/starter');
    } catch (e) {
      error = mensajeError(e);
    } finally {
      guardando = false;
    }
  }
</script>

<div class="grid min-h-screen place-items-center bg-paper px-6 py-12 dark:bg-ink-950">
  <form class="tarjeta aparecer w-full max-w-[460px] p-8" onsubmit={aceptar}>
    <div class="flex size-12 items-center justify-center rounded-2xl bg-brand-600 text-white">
      <Logo size={24} />
    </div>
    <h1 class="mt-4 text-[22px] font-extrabold tracking-tight">Antes de continuar</h1>
    <p class="mt-1.5 text-[13.5px] leading-relaxed text-slate-500 dark:text-slate-400">
      Actualizamos nuestros documentos legales. Necesitamos tu autorización expresa para seguir
      tratando los datos de tu cuenta.
    </p>

    <div class="mt-6"><Consentimiento bind:datos bind:terminos /></div>

    {#if error}
      <p class="mt-4 text-[13px] font-medium text-red-600" role="alert">{error}</p>
    {/if}

    <div class="mt-7 flex items-center justify-between gap-3">
      <button type="button" class="btn btn-secundario" onclick={() => signOut()}>Salir</button>
      <button type="submit" class="btn btn-primario" disabled={!datos || !terminos || guardando}>
        {guardando ? 'Guardando…' : 'Aceptar y continuar'}
      </button>
    </div>
  </form>
</div>
