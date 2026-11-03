<script lang="ts">
  import Logo from '$lib/shared/ui/Logo.svelte';
  import { auth, signIn } from '../model/auth.svelte';
  import { goto } from '$app/navigation';
  import { mensajeError } from '$lib/shared/api/errores';

  let email = $state('');
  let password = $state('');
  let cargando = $state(false);
  let error = $state('');

  const demos = [
    { etiqueta: 'Agencia verificada', email: 'graffiti@demo.com' },
    { etiqueta: 'En verificación', email: 'patrimonio@demo.com' },
    { etiqueta: 'Admin', email: 'admin@demo.com' },
  ];

  async function entrar(e: SubmitEvent) {
    e.preventDefault();
    cargando = true;
    error = '';
    try {
      await signIn(email.trim(), password);
      goto('#/starter');
    } catch (e) {
      error = 'Credenciales inválidas o error de conexión.';
    } finally {
      cargando = false;
    }
  }

  $effect(() => {
    if (auth.userId) goto('#/starter');
  });
</script>

<div class="grid min-h-screen lg:grid-cols-[5fr_6fr]">
  <!-- Hero de marca -->
  <div
    class="relative hidden overflow-hidden bg-gradient-to-br from-brand-600 to-brand-900 p-12 lg:flex
      lg:flex-col"
  >
    <div
      class="pointer-events-none absolute -top-32 -right-32 size-96 rounded-full
        bg-white/10 blur-3xl"
    ></div>
    <div
      class="pointer-events-none absolute -bottom-36 -left-24 size-80 rounded-full bg-white/6 blur-3xl"
    ></div>

    <div class="flex items-center gap-3 text-white">
      <Logo size={26} />
      <span class="text-lg font-extrabold tracking-tight">Diverso</span>
    </div>

    <div class="mt-auto">
      <h1 class="text-[38px] leading-[1.12] font-extrabold tracking-tight text-white">
        Vende Antioquia<br />al viajero correcto
      </h1>
      <p class="mt-4 max-w-md text-[15px] leading-relaxed text-white/70">
        El marketplace donde las agencias verificadas publican experiencias y los viajeros del
        Valle de Aburrá reservan con confianza.
      </p>
      <ul class="mt-9 space-y-3.5 text-[13.5px] font-medium text-white/90">
        <li class="flex items-center gap-3">
          <span class="rounded-[10px] bg-white/10 p-2">
            <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12l2 2 4-4m5.6-2.4A11.95 11.95 0 0112 2.6 11.95 11.95 0 012.4 7.6 11.77 11.77 0 004 16.6 11.95 11.95 0 0012 22 11.95 11.95 0 0020 16.6a11.77 11.77 0 001.6-9z"/></svg>
          </span>
          Sello «Verificada RNT» que genera confianza
        </li>
        <li class="flex items-center gap-3">
          <span class="rounded-[10px] bg-white/10 p-2">
            <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/></svg>
          </span>
          Cupos por fecha en tiempo real, sin sobreventa
        </li>
        <li class="flex items-center gap-3">
          <span class="rounded-[10px] bg-white/10 p-2">
            <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6"/></svg>
          </span>
          Conciliación clara: comisión 12% y saldo a dispersar
        </li>
      </ul>
    </div>

    <div class="mt-10 text-xs text-white/35">© Diverso · Turismo de Antioquia</div>
  </div>

  <!-- Formulario -->
  <div class="grid place-items-center bg-paper px-6 py-14 dark:bg-ink-950">
    <div
      class="w-full max-w-[400px] rounded-3xl border border-slate-200/80 bg-white p-8 shadow-xl/8
        dark:border-ink-600 dark:bg-ink-800 dark:shadow-black/50 aparecer"
    >
      <div class="flex size-14 items-center justify-center rounded-2xl bg-brand-600 text-white">
        <Logo size={28} />
      </div>
      <h2 class="mt-4 text-[23px] font-extrabold tracking-tight">Diverso · Agencias</h2>
      <p class="mt-1 text-[13.5px] text-slate-500 dark:text-slate-400">
        Publica planes, gestiona cupos y concilia tus pagos.
      </p>

      <form class="mt-6 space-y-3" onsubmit={entrar}>
        <label class="block">
          <span class="mb-1.5 block text-[12px] font-semibold text-slate-600 dark:text-slate-300"
            >Correo de la agencia</span
          >
          <input
            type="email"
            required
            bind:value={email}
            placeholder="tucorreo@agencia.com"
            class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[14px]
              outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-400/25
              dark:border-ink-600 dark:bg-ink-700"
          />
        </label>
        <label class="block">
          <span class="mb-1.5 block text-[12px] font-semibold text-slate-600 dark:text-slate-300"
            >Contraseña</span
          >
          <input
            type="password"
            required
            bind:value={password}
            placeholder="••••••••"
            class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[14px]
              outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-400/25
              dark:border-ink-600 dark:bg-ink-700"
          />
        </label>

        {#if error}
          <p class="text-center text-[13px] font-medium text-red-600">{error}</p>
        {/if}

        <button
          type="submit"
          disabled={cargando}
          class="w-full rounded-full bg-brand-600 py-2.5 text-[14.5px] font-bold text-white
            transition hover:bg-brand-500 disabled:opacity-60"
        >
          {cargando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>

      <div class="mt-6 text-[10.5px] font-bold tracking-[0.12em] text-slate-400">
        CUENTAS DEMO · CONTRASEÑA demo1234
      </div>
      <div class="mt-2.5 flex flex-wrap gap-2">
        {#each demos as d}
          <button
            class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[12px]
              font-semibold text-slate-600 transition hover:border-brand-300 hover:text-brand-600
              dark:border-ink-600 dark:bg-ink-700 dark:text-slate-300 dark:hover:border-brand-500"
            onclick={() => {
              email = d.email;
              password = 'demo1234';
              error = '';
            }}
          >
            {d.etiqueta}
          </button>
        {/each}
      </div>
    </div>
  </div>
</div>
