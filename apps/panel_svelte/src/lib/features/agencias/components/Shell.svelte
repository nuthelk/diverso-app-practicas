<script lang="ts">
  import type { Snippet } from 'svelte';
  import Logo from '$lib/shared/ui/Logo.svelte';
  import Avatar from '$lib/shared/ui/Avatar.svelte';
  import StatusPill from '$lib/shared/ui/StatusPill.svelte';
  import { TONOS_AVISO } from '$lib/shared/ui/tonos';
  import { auth, signOut } from '$lib/features/auth/model/auth.svelte';
  import { page } from '$app/state';
  import { rutaActual } from '$lib/shared/lib/ruta';
  import { miAgencia } from '../api/agencias.api';
  import { avisoVerificacion } from '../model/verificacion';
  import { estadoVigencia, type Agency } from '../model/agencia';
  import { esActiva, nombreCorto, SECCIONES, seccionActual } from '../model/navegacion';
  import AvatarAgencia from './AvatarAgencia.svelte';

  let { children }: { children: Snippet } = $props();

  let agencia = $state<Agency | null>(null);
  const path = $derived(rutaActual(page.url));
  const seccion = $derived(seccionActual(path));

  let menuAbierto = $state(false);
  let menuUsuario = $state(false);
  let oscuro = $state(document.documentElement.classList.contains('dark'));
  let contenedorUsuario = $state<HTMLElement>();
  let botonUsuario = $state<HTMLButtonElement>();
  let principal = $state<HTMLElement>();

  $effect(() => {
    if (!auth.userId) return;
    // Se recarga al navegar para reflejar cambios de verificación sin F5.
    void path;
    miAgencia()
      .then((a) => (agencia = a))
      .catch(() => {});
  });

  // Cerrar los menús al cambiar de sección.
  $effect(() => {
    void path;
    menuAbierto = false;
    menuUsuario = false;
  });

  function alternarTema(): void {
    oscuro = document.documentElement.classList.toggle('dark');
    try {
      localStorage.setItem('diverso-panel-theme', oscuro ? 'dark' : 'light');
    } catch {
      /* almacenamiento no disponible: el tema solo dura esta sesión */
    }
  }

  function alPulsarTecla(e: KeyboardEvent): void {
    if (e.key === 'Escape' && menuUsuario) {
      menuUsuario = false;
      botonUsuario?.focus();
    }
  }

  function alHacerClic(e: MouseEvent): void {
    if (menuUsuario && !contenedorUsuario?.contains(e.target as Node)) menuUsuario = false;
  }

  /** Aviso principal sobre el estado de la agencia (uno a la vez, el más urgente). */
  const aviso = $derived(agencia ? avisoVerificacion(agencia) : null);

  const ITEM =
    'flex w-full items-center gap-3 rounded-[10px] px-3 py-2 text-left text-[13.5px] font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-ink-700';
  const BOTON_ICONO =
    'inline-flex size-9 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-600 transition-colors hover:bg-slate-100 dark:border-ink-600 dark:bg-ink-800 dark:text-slate-400 dark:hover:bg-ink-700';
  const MODO_PRUEBA = 'Modo de prueba: los pagos no mueven dinero real';
</script>

<svelte:window onkeydown={alPulsarTecla} onclick={alHacerClic} />

{#snippet icono(trazo: string, clase = 'size-[18px]')}
  <svg class="{clase} shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d={trazo} />
  </svg>
{/snippet}

{#snippet temaIcono()}
  {#if oscuro}
    {@render icono('M12 8a4 4 0 100 8 4 4 0 000-8zM12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4l1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4m11.4-11.4l1.4-1.4')}
  {:else}
    {@render icono('M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z')}
  {/if}
{/snippet}

{#snippet avatar(tam: number)}
  {#if agencia?.logo_url}
    <AvatarAgencia {agencia} {tam} decorativo />
  {:else}
    <Avatar iniciales={agencia?.nombre ?? ''} {tam} />
  {/if}
{/snippet}

{#snippet itemsPie()}
  <a href="#/legal/terminos-agencias" class={ITEM}>
    {@render icono('M9 12h6m-6 4h6M7 3h7l5 5v11a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z')}
    Términos y privacidad
  </a>
{/snippet}

{#snippet itemsCuenta()}
  <button type="button" class={ITEM} onclick={alternarTema}>
    {@render temaIcono()}
    {oscuro ? 'Modo claro' : 'Modo oscuro'}
  </button>
  <button type="button" class={ITEM} onclick={() => signOut()}>
    {@render icono('M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4m7 14l5-5-5-5m5 5H9')}
    Cerrar sesión
  </button>
{/snippet}

{#snippet tarjetaAgencia()}
  {#if agencia}
    <div class="flex items-center gap-2.5 rounded-xl border border-slate-200/80 bg-paper p-2.5 dark:border-ink-600 dark:bg-ink-950">
      {@render avatar(32)}
      <div class="min-w-0">
        <div class="line-clamp-2 text-[12.5px] leading-tight font-bold">{agencia.nombre}</div>
        <div class="mt-1 flex flex-wrap items-center gap-1">
          <StatusPill estado={agencia.estado_verificacion} />
          {#if agencia.estado_verificacion === 'verificado' && estadoVigencia(agencia) !== 'vigente'}
            <StatusPill estado={estadoVigencia(agencia)} />
          {/if}
        </div>
      </div>
    </div>
  {/if}
{/snippet}

{#snippet enlacesSecciones()}
  {#each SECCIONES as s}
    <a
      href={'#' + s.ruta}
      aria-current={esActiva(path, s.ruta) ? 'page' : undefined}
      class="flex items-center gap-3 rounded-[10px] px-3 py-2 text-[13.5px] transition-colors
        {esActiva(path, s.ruta)
        ? 'bg-brand-600/12 font-bold text-acento-ink dark:bg-brand-400/15'
        : 'font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-ink-700'}"
    >
      {@render icono(s.icono)}
      {s.etiqueta}
    </a>
  {/each}
{/snippet}

{#snippet estadoPrueba(clase: string)}
  <span class="{clase} items-center gap-2 rounded-full bg-orange-500/12 px-3 py-[5px] text-[12px] font-semibold text-alert-ink" role="status">
    <i class="pulso size-[7px] shrink-0 rounded-full bg-orange-500" aria-hidden="true"></i>
    {MODO_PRUEBA}
  </span>
{/snippet}

<button type="button" class="saltar" onclick={() => principal?.focus()}>Saltar al contenido</button>

<div class="flex min-h-screen">
  <!-- Barra lateral (escritorio) -->
  <aside
    class="sticky top-0 flex h-screen w-[236px] shrink-0 flex-col border-r border-slate-200/80 bg-white
      px-3 pt-5 pb-4 max-md:hidden dark:border-ink-600 dark:bg-ink-900"
  >
    <div class="flex items-center gap-2.5 px-1.5">
      <div class="flex size-9 items-center justify-center rounded-xl bg-brand-600 text-white">
        <Logo size={22} />
      </div>
      <div>
        <div class="text-[15px] leading-tight font-extrabold tracking-[-0.2px]">Diverso</div>
        <div class="text-[10.5px] text-slate-600 dark:text-slate-400">Panel de agencias</div>
      </div>
    </div>

    <div class="mt-5">{@render tarjetaAgencia()}</div>

    <div id="gestion" class="mt-[22px] mb-1.5 px-2.5 text-[10px] font-bold tracking-[0.1em] text-slate-600 dark:text-slate-400">GESTIÓN</div>
    <nav class="flex flex-col gap-0.5" aria-labelledby="gestion">
      {@render enlacesSecciones()}
    </nav>

    <div class="mt-auto border-t border-slate-200/80 pt-2 dark:border-ink-600">{@render itemsPie()}</div>
  </aside>

  <div class="flex min-w-0 flex-1 flex-col">
    <!-- Barra superior (escritorio) -->
    <header
      class="sticky top-0 z-30 flex h-[60px] shrink-0 items-center gap-3 border-b border-slate-200/80 bg-paper/90 px-6
        backdrop-blur max-md:hidden lg:px-10 dark:border-ink-600 dark:bg-ink-950/90"
    >
      <p class="text-[13px] text-slate-600 dark:text-slate-400" data-migas>
        Panel{#if seccion}&nbsp;·&nbsp;<b class="font-bold text-slate-900 dark:text-slate-100">{seccion.etiqueta}</b>{/if}
      </p>
      <span class="flex-1"></span>
      {@render estadoPrueba('hidden lg:inline-flex')}
      <button type="button" class={BOTON_ICONO} aria-pressed={oscuro} aria-label="Modo oscuro" onclick={alternarTema}>
        {@render temaIcono()}
      </button>
      <div class="relative" bind:this={contenedorUsuario}>
        <button
          type="button"
          bind:this={botonUsuario}
          class="flex items-center gap-2 rounded-full border border-slate-200/80 bg-white py-[3px] pr-2.5 pl-[3px] text-[13px] font-semibold
            transition-colors hover:bg-slate-100 dark:border-ink-600 dark:bg-ink-800 dark:hover:bg-ink-700"
          aria-expanded={menuUsuario}
          aria-controls="menu-usuario"
          aria-haspopup="true"
          onclick={() => (menuUsuario = !menuUsuario)}
        >
          {@render avatar(28)}
          <span class="max-w-[140px] truncate">{nombreCorto(agencia?.nombre ?? '')}</span>
          {@render icono('M6 9l6 6 6-6', 'size-3.5')}
        </button>
        <div
          id="menu-usuario"
          hidden={!menuUsuario}
          class="absolute top-[46px] right-0 z-40 w-[220px] rounded-[14px] border border-slate-200/80 bg-white p-1.5 dark:border-ink-600 dark:bg-ink-800"
        >
          {@render itemsPie()}
          {@render itemsCuenta()}
        </div>
      </div>
    </header>

    <!-- Barra superior (móvil) -->
    <header
      class="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200/80 bg-white/90 px-4 py-2.5
        backdrop-blur md:hidden dark:border-ink-600 dark:bg-ink-900/90"
    >
      <div class="flex size-8 items-center justify-center rounded-lg bg-brand-600 text-white">
        <Logo size={18} />
      </div>
      <div class="min-w-0 flex-1 truncate text-[14px] font-extrabold tracking-tight">
        {agencia?.nombre ?? 'Diverso'}
      </div>
      <button
        class="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-ink-700"
        aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
        aria-expanded={menuAbierto}
        onclick={() => (menuAbierto = !menuAbierto)}
      >
        <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
          {#if menuAbierto}<path d="M6 6l12 12M18 6L6 18" />{:else}<path d="M4 7h16M4 12h16M4 17h16" />{/if}
        </svg>
      </button>
    </header>

    {#if menuAbierto}
      <div class="aparecer border-b border-slate-200/80 bg-white px-3 py-3 md:hidden dark:border-ink-600 dark:bg-ink-900">
        <div class="mb-3">{@render tarjetaAgencia()}</div>
        <nav class="flex flex-col gap-0.5" aria-label="Secciones">{@render enlacesSecciones()}</nav>
        <div class="mt-2 border-t border-slate-200/80 pt-2 dark:border-ink-600">
          {@render itemsPie()}
          {@render itemsCuenta()}
        </div>
      </div>
    {/if}

    <!-- El indicador de prueba va en la barra superior; en pantallas angostas, en su propia franja. -->
    <div class="flex justify-center border-b border-slate-200/80 px-4 py-2 lg:hidden dark:border-ink-600">
      {@render estadoPrueba('inline-flex')}
    </div>

    <!-- El Resumen muestra estos avisos arriba, con su acción: ahí el banner los repetiría. -->
    {#if aviso && !esActiva(path, '/dashboard')}
      <div class="px-5 py-2.5 text-[13px] leading-relaxed lg:px-10 {TONOS_AVISO[aviso.tono]}" role="status">
        {aviso.texto}
      </div>
    {/if}

    <main id="principal" tabindex="-1" bind:this={principal} class="min-w-0 flex-1 pb-20 outline-none md:pb-0">
      {@render children()}
    </main>

    <!-- Navegación inferior (móvil) -->
    <nav
      style="grid-template-columns: repeat({SECCIONES.length}, minmax(0, 1fr))"
      class="fixed inset-x-0 bottom-0 z-30 grid border-t border-slate-200/80 bg-white/95
        pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden dark:border-ink-600 dark:bg-ink-900/95"
      aria-label="Navegación inferior"
    >
      {#each SECCIONES as s}
        <a
          href={'#' + s.ruta}
          aria-current={esActiva(path, s.ruta) ? 'page' : undefined}
          class="flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold
            {esActiva(path, s.ruta) ? 'text-acento-ink' : 'text-slate-600 dark:text-slate-400'}"
        >
          {@render icono(s.icono, 'size-5')}
          {s.corta ?? s.etiqueta}
        </a>
      {/each}
    </nav>
  </div>
</div>
