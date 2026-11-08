<script lang="ts">
  import type { Snippet } from 'svelte';
  import Logo from '$lib/shared/ui/Logo.svelte';
  import Icono from '$lib/shared/ui/Icono.svelte';
  import { ICONOS } from '$lib/shared/ui/iconos';
  import Avatar from '$lib/shared/ui/Avatar.svelte';
  import StatusPill from '$lib/shared/ui/StatusPill.svelte';
  import { TONOS_AVISO } from '$lib/shared/ui/tonos';
  import { auth } from '$lib/features/auth/model/auth.svelte';
  import MenuCuenta from '$lib/features/auth/components/MenuCuenta.svelte';
  import { page } from '$app/state';
  import { rutaActual } from '$lib/shared/lib/ruta';
  import { miAgencia } from '../api/agencias.api';
  import { avisoVerificacion } from '../model/verificacion';
  import { estadoVigencia, type Agency } from '../model/agencia';
  import { esActiva, SECCIONES } from '../model/navegacion';
  import AvatarAgencia from './AvatarAgencia.svelte';

  /**
   * El marco del panel («Tablero operativo»): una barra superior sobre el monte con la marca, las secciones, el
   * «Modo de prueba» y el menú de cuenta. La misma barra de secciones es la de pestañas en pantallas anchas y la
   * barra inferior en el celular (un solo marcado, sin repetir las secciones).
   */
  let { children }: { children: Snippet } = $props();

  let agencia = $state<Agency | null>(null);
  const path = $derived(rutaActual(page.url));
  let principal = $state<HTMLElement>();

  $effect(() => {
    if (!auth.userId) return;
    // Se recarga al navegar para reflejar cambios de verificación sin F5.
    void path;
    miAgencia()
      .then((a) => (agencia = a))
      .catch(() => {});
  });

  /** Aviso principal sobre el estado de la agencia (uno a la vez, el más urgente). */
  const aviso = $derived(agencia ? avisoVerificacion(agencia) : null);
</script>

<button type="button" class="saltar" onclick={() => principal?.focus()}>Saltar al contenido</button>

<header class="monte sticky top-0 z-40 flex min-h-[60px] items-center gap-3 bg-bosque px-4 py-2 text-sobre-bosque lg:gap-5 lg:px-8">
  <a href="#/dashboard" class="mr-2 flex min-w-0 items-center gap-2.5 no-underline" aria-label="Diverso, panel de agencias, ir al resumen">
    <span class="grid size-[34px] shrink-0 place-items-center rounded-brote bg-bosque-2"><Logo size={22} /></span>
    <b class="text-destacado">Diverso</b>
    <small class="hidden text-detalle text-sobre-bosque-2 min-[1340px]:block">Panel de agencias</small>
  </a>

  <!-- Pestañas desde `lg`; debajo de `lg` la misma lista es la barra inferior, fija sobre la zona segura del teléfono. -->
  <nav
    aria-label="Secciones del panel"
    class="max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-40 max-lg:border-t max-lg:border-linea max-lg:bg-superficie
      max-lg:pb-[env(safe-area-inset-bottom)] max-lg:text-tinta-2 max-lg:[--anillo:var(--foco)]"
  >
    <ul class="grid h-[68px] grid-cols-5 lg:flex lg:h-auto lg:items-center lg:gap-0.5">
      {#each SECCIONES as s}
        {@const activa = esActiva(path, s.ruta)}
        <li class="lg:contents">
          <a
            href={'#' + s.ruta}
            aria-current={activa ? 'page' : undefined}
            aria-label={s.corta ? s.etiqueta : undefined}
            class="relative flex h-full flex-col items-center gap-[3px] px-0.5 pt-[7px] text-center text-nota leading-[1.1] no-underline
              lg:h-auto lg:min-h-11 lg:flex-row lg:rounded-pildora lg:px-3.5 lg:pt-0 lg:text-cuerpo lg:text-sobre-bosque lg:transition-colors lg:hover:bg-bosque-2
              {activa
              ? 'font-extrabold text-tinta lg:bg-bosque-2 lg:font-bold lg:after:absolute lg:after:inset-x-4 lg:after:bottom-[3px] lg:after:h-[3px] lg:after:rounded-pildora lg:after:bg-sobre-bosque'
              : 'font-semibold'}"
          >
            <span class="grid h-7 w-[50px] place-items-center rounded-pildora lg:hidden {activa ? 'bg-heliconia text-sobre-heliconia' : ''}">
              <Icono trazo={s.icono} clase="size-5" />
            </span>
            {#if s.corta}
              <!-- La etiqueta completa solo cabe desde 1340 px; el nombre accesible es siempre el completo. -->
              <span aria-hidden="true" class="min-[1340px]:hidden">{s.corta}</span>
              <span aria-hidden="true" class="hidden min-[1340px]:inline">{s.etiqueta}</span>
            {:else}
              {s.etiqueta}
            {/if}
          </a>
        </li>
      {/each}
    </ul>
  </nav>

  <div class="ml-auto flex items-center gap-3">
    <p class="prueba" role="status">
      <Icono trazo={ICONOS.info} clase="size-4 max-[380px]:hidden" />
      <span>Modo de prueba<span class="max-[1180px]:hidden">: los pagos no mueven dinero real</span></span>
    </p>
    <MenuCuenta titulo={agencia?.nombre ?? ''}>
      {#snippet avatar(tam)}
        {#if agencia?.logo_url}
          <AvatarAgencia {agencia} {tam} decorativo />
        {:else}
          <Avatar iniciales={agencia?.nombre ?? ''} {tam} />
        {/if}
      {/snippet}
      {#snippet estado()}
        {#if agencia}
          {agencia.ciudad}
          <StatusPill estado={agencia.estado_verificacion} />
          {#if agencia.estado_verificacion === 'verificado' && estadoVigencia(agencia) !== 'vigente'}
            <StatusPill estado={estadoVigencia(agencia)} />
          {/if}
        {/if}
      {/snippet}
    </MenuCuenta>
  </div>
</header>

<!-- El Resumen muestra estos avisos arriba, con su acción: ahí el banner los repetiría. -->
{#if aviso && !esActiva(path, '/dashboard')}
  <div class="px-5 py-3 text-cuerpo font-semibold lg:px-8 {TONOS_AVISO[aviso.tono]}" role="status">
    {aviso.texto}
  </div>
{/if}

<main id="principal" tabindex="-1" bind:this={principal} class="min-w-0 outline-none max-lg:pb-[calc(84px+env(safe-area-inset-bottom))]">
  {@render children()}
</main>
