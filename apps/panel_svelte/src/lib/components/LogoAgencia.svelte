<script lang="ts">
  import { subirLogo, quitarLogo, mensajeError } from '../api';
  import AvatarAgencia from './AvatarAgencia.svelte';
  import { validarLogo } from '../logo';
  import { avisar } from '../toast.svelte';
  import type { Agency } from '../types';

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

<section class="tarjeta p-5" aria-labelledby="logo-titulo">
  <div class="flex flex-wrap items-center gap-5">
    <AvatarAgencia {agencia} tam={72} />

    <div class="min-w-[220px] flex-1">
      <h2 id="logo-titulo" class="text-[15px] font-bold">Logo</h2>
      <p class="mt-0.5 text-[12.5px] leading-relaxed text-slate-500 dark:text-slate-400">
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
        <p class="mt-2 text-[12.5px] font-medium text-red-600" role="alert">{error}</p>
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
</section>
