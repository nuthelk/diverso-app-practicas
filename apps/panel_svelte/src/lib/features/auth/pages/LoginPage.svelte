<script lang="ts">
  import Logo from '$lib/shared/ui/Logo.svelte';
  import MarcaTile from '$lib/shared/ui/MarcaTile.svelte';
  import Icono from '$lib/shared/ui/Icono.svelte';
  import { ICONOS } from '$lib/shared/ui/iconos';
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

  const BENEFICIOS = [
    { icono: ICONOS.escudo, texto: 'Sello «Verificada RNT» que genera confianza' },
    { icono: ICONOS.calendario, texto: 'Cupos por fecha en tiempo real, sin sobreventa' },
    { icono: ICONOS.edificio, texto: 'Conciliación clara: comisión 12% y saldo a dispersar' },
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
  <!-- Marca: superficie clara con el colibrí de fondo -->
  <aside class="relative hidden overflow-hidden border-r border-linea bg-brand-50 p-12 lg:flex lg:flex-col dark:bg-ink-900">
    <Logo size={520} clase="pointer-events-none absolute -right-28 -bottom-24 text-brand-600/[0.07] dark:text-brand-300/[0.06]" />

    <div class="relative flex items-center gap-3">
      <MarcaTile tam={40} />
      <span class="text-lg font-extrabold tracking-tight">Diverso</span>
    </div>

    <div class="relative mt-auto">
      <h1 class="text-[38px] leading-[1.12] font-extrabold tracking-tight">
        Vende Antioquia<br />al viajero correcto
      </h1>
      <p class="mt-4 max-w-md text-[15px] leading-relaxed text-suave">
        El marketplace donde las agencias verificadas publican experiencias y los viajeros del
        Valle de Aburrá reservan con confianza.
      </p>
      <ul class="mt-9 space-y-3.5 text-[13.5px] font-medium">
        {#each BENEFICIOS as b}
          <li class="flex items-center gap-3">
            <span class="rounded-[10px] bg-brand-600/10 p-2 text-acento-ink dark:bg-brand-400/15">
              <Icono trazo={b.icono} clase="size-4" />
            </span>
            {b.texto}
          </li>
        {/each}
      </ul>
    </div>

    <div class="relative mt-10 text-xs text-suave">© Diverso · Turismo de Antioquia</div>
  </aside>

  <!-- Formulario -->
  <div class="grid place-items-center bg-paper px-5 py-14 sm:px-6 dark:bg-ink-950">
    <div class="tarjeta aparecer w-full max-w-[400px] p-8">
      <MarcaTile tam={52} />
      <h2 class="mt-4 text-[23px] font-extrabold tracking-tight">Diverso · Agencias</h2>
      <p class="mt-1 text-[13.5px] text-suave">Publica planes, gestiona cupos y concilia tus pagos.</p>

      <form class="mt-6 space-y-3.5" onsubmit={entrar}>
        <label class="block">
          <span class="etiqueta-campo">Correo de la agencia</span>
          <input type="email" required bind:value={email} placeholder="tucorreo@agencia.com" class="campo" />
        </label>
        <label class="block">
          <span class="etiqueta-campo">Contraseña</span>
          <input type="password" required bind:value={password} placeholder="••••••••" class="campo" />
        </label>

        {#if error}
          <p class="text-center text-[13px] font-medium text-error-ink" role="alert">{error}</p>
        {/if}

        <button type="submit" disabled={cargando} class="btn btn-primario w-full py-2.5">
          {cargando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>

      <div class="etiqueta-seccion mt-6">CUENTAS DEMO · CONTRASEÑA demo1234</div>
      <div class="mt-2.5 flex flex-wrap gap-2">
        {#each demos as d}
          <button
            type="button"
            class="chip"
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
