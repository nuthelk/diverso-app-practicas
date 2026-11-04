<script lang="ts">
  import Curvas from '$lib/shared/ui/Curvas.svelte';
  import MarcaTile from '$lib/shared/ui/MarcaTile.svelte';
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

<div class="relative grid min-h-screen place-items-center overflow-hidden bg-niebla px-6 py-12">
  <Curvas clase="-top-20 -right-24 h-[320px] w-[640px] max-w-none text-musgo opacity-30" />
  <form class="tarjeta aparecer relative w-full max-w-[480px] rounded-hoja-grande p-8 sm:p-9" onsubmit={aceptar}>
    <MarcaTile tam={52} />
    <h1 class="mt-4 text-[30px] leading-[1.1]">Antes de continuar</h1>
    <p class="mt-2 text-[16px] leading-relaxed text-tinta-2">
      Actualizamos nuestros documentos legales. Necesitamos tu autorización expresa para seguir
      tratando los datos de tu cuenta.
    </p>

    <div class="mt-6"><Consentimiento bind:datos bind:terminos /></div>

    {#if error}
      <p class="mt-4 text-[15px] font-semibold text-heliconia" role="alert">{error}</p>
    {/if}

    <div class="mt-7 flex items-center justify-between gap-3">
      <button type="button" class="btn btn-secundario" onclick={() => signOut()}>Salir</button>
      <button type="submit" class="btn btn-primario" disabled={!datos || !terminos || guardando}>
        {guardando ? 'Guardando…' : 'Aceptar y continuar'}
      </button>
    </div>
  </form>
</div>
