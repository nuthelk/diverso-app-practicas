<script lang="ts">
  import { tick } from 'svelte';
  import Logo from '$lib/shared/ui/Logo.svelte';
  import AlertaError from '$lib/shared/ui/AlertaError.svelte';
  import Consentimiento from '../components/Consentimiento.svelte';
  import { consentimientosPendientes, registrarConsentimiento } from '../api/legal.api';
  import { mensajeError } from '$lib/shared/api/errores';
  import { signOut } from '$lib/features/auth/model/auth.svelte';
  import { goto } from '$app/navigation';

  // Se llega aquí cuando la cuenta no tiene aceptada la versión vigente
  // (cuentas creadas antes de la v1 o cambio de versión de los documentos).
  let datos = $state(false);
  let terminos = $state(false);
  let guardando = $state(false);
  let error = $state('');
  let intentado = $state(false);
  let formulario = $state<HTMLFormElement>();

  async function aceptar(e: SubmitEvent) {
    e.preventDefault();
    intentado = true;
    if (!datos || !terminos) {
      await tick();
      formulario?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      return;
    }
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

<main class="grid min-h-screen place-items-center bg-niebla px-6 py-12">
  <form bind:this={formulario} class="tarjeta aparecer w-full max-w-lg p-6 sm:p-8" onsubmit={aceptar} novalidate>
    <Logo size={36} clase="text-helecho" />
    <h1 class="mt-4 text-pagina">Antes de continuar</h1>
    <p class="mt-2 text-cuerpo text-tinta-2">
      Actualizamos nuestros documentos legales. Necesitamos tu autorización expresa para seguir tratando los datos de tu
      cuenta. Léelos con los enlaces de cada casilla.
    </p>

    <div class="mt-6">
      <Consentimiento
        bind:datos
        bind:terminos
        errorDatos={intentado && !datos ? 'Marca la autorización de datos para continuar.' : undefined}
        errorTerminos={intentado && !terminos ? 'Acepta los términos y condiciones para continuar.' : undefined}
      />
    </div>

    {#if error}
      <AlertaError clase="mt-4">{error}</AlertaError>
    {/if}

    <div class="mt-7 flex items-center justify-between gap-3">
      <button type="button" class="btn btn-secundario" onclick={() => signOut()}>Salir</button>
      <button type="submit" class="btn btn-primario" disabled={guardando}>
        {guardando ? 'Guardando…' : 'Aceptar y continuar'}
      </button>
    </div>
  </form>
</main>
