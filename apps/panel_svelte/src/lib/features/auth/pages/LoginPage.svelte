<script lang="ts">
  import Logo from '$lib/shared/ui/Logo.svelte';
  import MarcaTile from '$lib/shared/ui/MarcaTile.svelte';
  import Curvas from '$lib/shared/ui/Curvas.svelte';
  import Helecho from '$lib/shared/ui/Helecho.svelte';
  import Heliconia from '$lib/shared/ui/Heliconia.svelte';
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
  <!-- Marca: el monte oscuro del riel, con curvas de nivel, helecho y el colibrí -->
  <aside class="monte relative hidden overflow-hidden bg-bosque p-12 text-sobre-bosque lg:flex lg:flex-col">
    <Curvas forma="alto" clase="inset-0 size-full text-sobre-bosque-2 opacity-[0.17]" />
    <Helecho clase="-bottom-10 left-8 h-[380px] w-[253px] text-sobre-bosque-2 opacity-30" />
    <Heliconia clase="top-0 right-14 h-[140px] w-[88px] text-heliconia opacity-90" />

    <div class="relative flex items-center gap-3">
      <Logo size={40} />
      <span class="font-titulo text-[28px] leading-none font-bold tracking-[0.01em]">Diverso</span>
    </div>

    <div class="relative mt-auto">
      <h1 class="text-[46px] leading-[1.06] tracking-[-0.003em]">
        Vende Antioquia<br />al viajero correcto
      </h1>
      <p class="mt-5 max-w-md text-[17px] leading-relaxed text-sobre-bosque-2">
        El marketplace donde las agencias verificadas publican experiencias y los viajeros del
        Valle de Aburrá reservan con confianza.
      </p>
      <ul class="mt-9 space-y-4 text-[16px] font-semibold">
        {#each BENEFICIOS as b}
          <li class="flex items-center gap-3.5">
            <span class="grid size-10 shrink-0 place-items-center rounded-brote border-[1.5px] border-sobre-bosque-2 bg-bosque-2">
              <Icono trazo={b.icono} clase="size-5" />
            </span>
            {b.texto}
          </li>
        {/each}
      </ul>
    </div>

    <div class="relative mt-10 text-sm text-sobre-bosque-2">© Diverso · Turismo de Antioquia</div>
  </aside>

  <!-- Formulario -->
  <div class="relative grid place-items-center overflow-hidden bg-niebla px-5 py-14 sm:px-6">
    <Curvas clase="-top-20 -right-24 h-[320px] w-[640px] max-w-none text-musgo opacity-30" />
    <div class="tarjeta aparecer relative w-full max-w-[420px] rounded-hoja-grande p-8 sm:p-9">
      <div class="flex items-center gap-3">
        <MarcaTile tam={52} />
        <h2 class="text-[26px] leading-[1.1]">Diverso · Agencias</h2>
      </div>
      <p class="mt-3 text-[16px] text-tinta-2">Publica planes, gestiona cupos y concilia tus pagos.</p>

      <form class="mt-6 space-y-4" onsubmit={entrar}>
        <label class="block">
          <span class="etiqueta-campo">Correo de la agencia</span>
          <input type="email" required bind:value={email} placeholder="tucorreo@agencia.com" class="campo" />
        </label>
        <label class="block">
          <span class="etiqueta-campo">Contraseña</span>
          <input type="password" required bind:value={password} placeholder="••••••••" class="campo" />
        </label>

        {#if error}
          <p class="text-center text-[15px] font-semibold text-heliconia" role="alert">{error}</p>
        {/if}

        <button type="submit" disabled={cargando} class="btn btn-primario w-full">
          {cargando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>

      <div class="etiqueta-seccion mt-7 border-t border-dashed border-linea pt-5">CUENTAS DEMO · CONTRASEÑA <span class="normal-case">demo1234</span></div>
      <div class="mt-3 flex flex-wrap gap-2">
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
