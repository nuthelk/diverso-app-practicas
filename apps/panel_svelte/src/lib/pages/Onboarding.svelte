<script lang="ts">
  import Logo from '../components/Logo.svelte';
  import { registrarAgencia, mensajeError } from '../api';
  import { go } from '../router.svelte';
  import { avisar } from '../toast.svelte';

  let nombre = $state('');
  let numeroRnt = $state('');
  let matricula = $state('');
  let ciudad = $state('');
  let telefono = $state('');
  let email = $state('');
  let whatsapp = $state('');
  let descripcion = $state('');
  let guardando = $state(false);
  let error = $state('');

  async function guardar(e: SubmitEvent) {
    e.preventDefault();
    guardando = true;
    error = '';
    try {
      await registrarAgencia({
        nombre: nombre.trim(),
        numero_rnt: numeroRnt.trim(),
        matricula_camara_comercio: matricula.trim(),
        ciudad: ciudad.trim(),
        telefono: telefono.trim(),
        email: email.trim(),
        whatsapp: whatsapp.trim(),
        descripcion: descripcion.trim(),
      });
      avisar('Agencia registrada. Quedaste en verificación.');
      go('/dashboard');
    } catch (e) {
      error = mensajeError(e);
    } finally {
      guardando = false;
    }
  }
</script>

<div class="mx-auto max-w-[720px] px-6 py-12">
  <div class="flex items-center gap-3">
    <div class="flex size-11 items-center justify-center rounded-2xl bg-brand-600 text-white">
      <Logo size={22} />
    </div>
    <h1 class="text-[26px] font-extrabold tracking-tight">Registra tu agencia</h1>
  </div>
  <p class="mt-2 text-[13.5px] text-slate-500 dark:text-slate-400">
    Con el RNT y la matrícula de Cámara de Comercio. El equipo Diverso verifica tu registro antes
    de publicar planes.
  </p>

  <form
    class="mt-8 grid gap-4 rounded-3xl border border-slate-200/80 bg-white p-7
      dark:border-ink-600 dark:bg-ink-800 sm:grid-cols-2"
    onsubmit={guardar}
  >
    <label class="sm:col-span-2">
      <span class="mb-1.5 block text-[12px] font-semibold">Nombre de la agencia *</span>
      <input required bind:value={nombre} class="campo" />
    </label>
    <label>
      <span class="mb-1.5 block text-[12px] font-semibold">Número RNT *</span>
      <input required bind:value={numeroRnt} class="campo" />
    </label>
    <label>
      <span class="mb-1.5 block text-[12px] font-semibold">Matrícula C. de Comercio *</span>
      <input required bind:value={matricula} class="campo" />
    </label>
    <label>
      <span class="mb-1.5 block text-[12px] font-semibold">Ciudad *</span>
      <input required bind:value={ciudad} class="campo" />
    </label>
    <label>
      <span class="mb-1.5 block text-[12px] font-semibold">Teléfono *</span>
      <input required bind:value={telefono} class="campo" />
    </label>
    <label>
      <span class="mb-1.5 block text-[12px] font-semibold">Email *</span>
      <input type="email" required bind:value={email} class="campo" />
    </label>
    <label>
      <span class="mb-1.5 block text-[12px] font-semibold">WhatsApp</span>
      <input bind:value={whatsapp} placeholder="+57…" class="campo" />
    </label>
    <label class="sm:col-span-2">
      <span class="mb-1.5 block text-[12px] font-semibold">Descripción</span>
      <textarea rows="3" bind:value={descripcion} class="campo resize-none"></textarea>
    </label>

    {#if error}
      <p class="text-[13px] font-medium text-red-600 sm:col-span-2">{error}</p>
    {/if}

    <div class="flex justify-end gap-3 sm:col-span-2">
      <button
        type="submit"
        disabled={guardando}
        class="rounded-full bg-brand-600 px-6 py-2.5 text-[14px] font-bold text-white transition
          hover:bg-brand-500 disabled:opacity-60"
      >
        {guardando ? 'Guardando…' : 'Registrar agencia'}
      </button>
    </div>
  </form>
</div>

<style>
  .campo {
    width: 100%;
    border-radius: 12px;
    border: 1px solid rgb(0 0 0 / 0.1);
    background: rgb(0 0 0 / 0.03);
    padding: 9px 14px;
    font-size: 14px;
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  :global(.dark) .campo {
    border-color: rgb(255 255 255 / 0.09);
    background: rgb(255 255 255 / 0.04);
  }
  .campo:focus {
    border-color: var(--color-brand-400);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-brand-400) 25%, transparent);
  }
</style>
