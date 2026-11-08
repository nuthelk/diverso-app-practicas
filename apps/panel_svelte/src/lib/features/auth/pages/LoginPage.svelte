<script lang="ts">
  import Logo from '$lib/shared/ui/Logo.svelte';
  import Icono from '$lib/shared/ui/Icono.svelte';
  import Campo from '$lib/shared/ui/Campo.svelte';
  import AlertaError from '$lib/shared/ui/AlertaError.svelte';
  import { ICONOS } from '$lib/shared/ui/iconos';
  import { auth, signIn } from '../model/auth.svelte';
  import { goto } from '$app/navigation';
  import CuentasDemo from './CuentasDemo.svelte';

  let email = $state('');
  let password = $state('');
  let cargando = $state(false);
  let error = $state('');

  const BENEFICIOS = [
    { icono: ICONOS.escudo, texto: 'Sello «Verificada RNT» que genera confianza' },
    { icono: ICONOS.calendario, texto: 'Cupos por fecha en tiempo real, sin sobreventa' },
    { icono: ICONOS.edificio, texto: 'Conciliación clara de tu comisión y del saldo a dispersar' },
  ];

  async function entrar(e: SubmitEvent) {
    e.preventDefault();
    cargando = true;
    error = '';
    try {
      await signIn(email.trim(), password);
      goto('#/starter');
    } catch {
      error = 'Correo o contraseña incorrectos, o no hay conexión. Intenta de nuevo.';
    } finally {
      cargando = false;
    }
  }

  $effect(() => {
    if (auth.userId) goto('#/starter');
  });
</script>

<div class="grid min-h-screen lg:grid-cols-[5fr_6fr]">
  <!-- Marca: el monte oscuro del marco, con el logo y lo que ofrece el panel -->
  <aside class="monte hidden bg-bosque p-12 text-sobre-bosque lg:flex lg:flex-col">
    <div class="flex items-center gap-3">
      <Logo size={36} />
      <span class="text-seccion font-bold">Diverso</span>
    </div>

    <div class="mt-auto">
      <p class="text-cifra-grande font-bold text-balance">Vende Antioquia al viajero correcto</p>
      <p class="mt-4 max-w-md text-destacado text-sobre-bosque-2">
        El marketplace donde las agencias verificadas publican experiencias y los viajeros del Valle de Aburrá reservan con
        confianza.
      </p>
      <ul class="mt-8 space-y-4 text-cuerpo font-semibold">
        {#each BENEFICIOS as b}
          <li class="flex items-center gap-3.5">
            <span class="grid size-10 shrink-0 place-items-center rounded-campo bg-bosque-2">
              <Icono trazo={b.icono} clase="size-5" />
            </span>
            {b.texto}
          </li>
        {/each}
      </ul>
    </div>

    <p class="mt-10 text-detalle text-sobre-bosque-2">© Diverso · Turismo de Antioquia</p>
  </aside>

  <main class="grid place-items-center bg-niebla px-5 py-12 sm:px-6">
    <div class="aparecer w-full max-w-md">
      <div class="mb-6 flex items-center gap-2.5 text-helecho lg:hidden">
        <Logo size={32} />
        <span class="text-destacado font-bold text-tinta">Diverso</span>
      </div>

      <div class="tarjeta p-6 sm:p-8">
        <h1 class="text-pagina">Entra a tu panel</h1>
        <p class="mt-2 text-cuerpo text-tinta-2">Publica planes, gestiona cupos y concilia tus pagos.</p>

        <form class="mt-6 space-y-4" onsubmit={entrar}>
          <Campo etiqueta="Correo de la agencia">
            {#snippet control(a)}
              <input
                {...a}
                type="email"
                required
                bind:value={email}
                placeholder="tucorreo@agencia.com"
                autocomplete="username"
                class="campo"
              />
            {/snippet}
          </Campo>
          <Campo etiqueta="Contraseña">
            {#snippet control(a)}
              <input {...a} type="password" required bind:value={password} autocomplete="current-password" class="campo" />
            {/snippet}
          </Campo>

          {#if error}
            <AlertaError>{error}</AlertaError>
          {/if}

          <button type="submit" disabled={cargando} class="btn btn-primario w-full">
            {cargando ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        {#if import.meta.env.DEV}
          <CuentasDemo
            elegir={(correo, clave) => {
              email = correo;
              password = clave;
              error = '';
            }}
          />
        {/if}
      </div>
    </div>
  </main>
</div>
