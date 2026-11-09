<script lang="ts">
  import { subirLogo, quitarLogo } from '../api/agencias.api';
  import { mensajeError } from '$lib/shared/api/errores';
  import Tarjeta from '$lib/shared/ui/Tarjeta.svelte';
  import AlertaError from '$lib/shared/ui/AlertaError.svelte';
  import AvatarAgencia from './AvatarAgencia.svelte';
  import { validarLogo } from '../model/logo';
  import { avisar } from '$lib/shared/lib/toast.svelte';
  import type { Agency } from '../model/agencia';

  let {
    agencia,
    onactualizado,
  }: {
    agencia: Agency;
    /** Recibe la URL pública nueva, o null cuando se quitó el logo. */
    onactualizado: (logoUrl: string | null) => void;
  } = $props();

  let ocupado = $state<'' | 'subiendo' | 'quitando'>('');
  let error = $state('');
  let entrada: HTMLInputElement;

  const logo = $derived(agencia.logo_url || null);

  async function elegido(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const archivo = input.files?.[0];
    input.value = ''; // permite volver a elegir el mismo archivo
    if (!archivo) return;
    error = validarLogo(archivo) ?? '';
    if (error) return;
    ocupado = 'subiendo';
    try {
      onactualizado(await subirLogo(agencia, archivo));
      avisar('Logo actualizado.');
    } catch (err) {
      error = mensajeError(err);
    } finally {
      ocupado = '';
    }
  }

  async function quitar() {
    error = '';
    ocupado = 'quitando';
    try {
      await quitarLogo(agencia);
      onactualizado(null);
      avisar('Logo eliminado.');
    } catch (err) {
      error = mensajeError(err);
    } finally {
      ocupado = '';
    }
  }
</script>

<Tarjeta titulo="Logo">
  <div class="flex flex-wrap items-center gap-5">
    <AvatarAgencia {agencia} tam={72} />

    <div class="min-w-[220px] flex-1">
      <p class="text-detalle text-tinta-2">
        Los viajeros lo ven junto al nombre de tu agencia en la app. PNG, JPG o WebP de hasta 2 MB. Mientras no
        subas uno, mostramos tus iniciales.
      </p>
      <div class="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          class="btn {logo ? 'btn-secundario' : 'btn-primario'}"
          disabled={ocupado !== ''}
          onclick={() => entrada.click()}
        >
          {ocupado === 'subiendo' ? 'Subiendo…' : logo ? 'Reemplazar logo' : 'Subir logo'}
        </button>
        {#if logo}
          <button type="button" class="btn btn-peligro" disabled={ocupado !== ''} onclick={quitar}>
            {ocupado === 'quitando' ? 'Quitando…' : 'Quitar logo'}
          </button>
        {/if}
      </div>
      {#if error}
        <AlertaError clase="mt-2 text-detalle">{error}</AlertaError>
      {/if}
    </div>
  </div>

  <input
    bind:this={entrada}
    type="file"
    class="hidden"
    accept="image/png,image/jpeg,image/webp"
    aria-label="Archivo del logo"
    onchange={elegido}
  />
</Tarjeta>
