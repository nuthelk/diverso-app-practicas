<script lang="ts">
  import type { Snippet } from 'svelte';
  import Logo from '$lib/shared/ui/Logo.svelte';
  import Icono from '$lib/shared/ui/Icono.svelte';
  import { ICONOS } from '$lib/shared/ui/iconos';
  import Avatar from '$lib/shared/ui/Avatar.svelte';
  import StatusPill from '$lib/shared/ui/StatusPill.svelte';
  import Curvas from '$lib/shared/ui/Curvas.svelte';
  import Helecho from '$lib/shared/ui/Helecho.svelte';
  import Heliconia from '$lib/shared/ui/Heliconia.svelte';
  import Bruma from '$lib/shared/ui/Bruma.svelte';
  import { TONOS_AVISO } from '$lib/shared/ui/tonos';
  import { auth, signOut } from '$lib/features/auth/model/auth.svelte';
  import { page } from '$app/state';
  import { rutaActual } from '$lib/shared/lib/ruta';
  import { fechaLarga } from '$lib/shared/lib/format';
  import { fechaBogota } from '$lib/features/planes/model/plan';
  import { miAgencia } from '../api/agencias.api';
  import { avisoVerificacion } from '../model/verificacion';
  import { estadoVigencia, type Agency } from '../model/agencia';
  import { esActiva, SECCIONES, seccionActual } from '../model/navegacion';
  import AvatarAgencia from './AvatarAgencia.svelte';

  let { children }: { children: Snippet } = $props();

  let agencia = $state<Agency | null>(null);
  const path = $derived(rutaActual(page.url));
  const seccion = $derived(seccionActual(path));
  /** El día de hoy en Bogotá, que es el de las salidas (no el de la zona del navegador). */
  const hoy = fechaBogota();

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

  // Cerrar el menú al cambiar de sección.
  $effect(() => {
    void path;
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
    'flex min-h-11 w-full items-center gap-3 rounded-[10px] px-3.5 text-left text-[15px] font-semibold transition-colors hover:bg-niebla-2';
  // Sobre la barra oscura del celular los controles son de contorno claro; sobre la niebla del escritorio, los de siempre.
  const CONTROL =
    'max-lg:border-sobre-bosque-2 max-lg:bg-transparent max-lg:text-sobre-bosque max-lg:hover:bg-bosque-2';
  const MODO_PRUEBA = 'Modo de prueba: los pagos no mueven dinero real';
</script>

<svelte:window onkeydown={alPulsarTecla} onclick={alHacerClic} />

{#snippet avatar(tam: number)}
  {#if agencia?.logo_url}
    <AvatarAgencia {agencia} {tam} decorativo />
  {:else}
    <Avatar iniciales={agencia?.nombre ?? ''} {tam} />
  {/if}
{/snippet}

<button type="button" class="saltar" onclick={() => principal?.focus()}>Saltar al contenido</button>

<div class="flex min-h-screen">
  <!-- Riel (escritorio): el monte oscuro con el sendero de navegación -->
  <aside class="monte sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-6 overflow-hidden bg-bosque px-5 py-7 text-sobre-bosque lg:flex">
    <Curvas forma="alto" clase="inset-0 size-full text-sobre-bosque-2 opacity-[0.17]" />
    <Helecho clase="-bottom-[34px] left-[34px] h-[285px] w-[190px] text-sobre-bosque-2 opacity-30" />

    <a href="#/dashboard" class="relative flex items-center gap-3 px-1.5 no-underline" aria-label="Diverso, panel de agencias, ir al resumen">
      <Logo size={38} />
      <span>
        <b class="font-titulo block text-[26px] leading-none tracking-[0.01em]">Diverso</b>
        <small class="mt-[3px] block text-sm text-sobre-bosque-2">Panel de agencias</small>
      </span>
    </a>

    {#if agencia}
      <div class="relative flex items-center gap-3 rounded-hoja bg-bosque-2 px-3.5 py-3" role="group" aria-label="Agencia activa">
        {@render avatar(42)}
        <div class="min-w-0">
          <b class="font-titulo line-clamp-2 text-[17px] leading-tight">{agencia.nombre}</b>
          <small class="block text-sm text-sobre-bosque-2">{agencia.ciudad}</small>
          <div class="mt-1.5 flex flex-wrap items-center gap-1">
            <StatusPill estado={agencia.estado_verificacion} />
            {#if agencia.estado_verificacion === 'verificado' && estadoVigencia(agencia) !== 'vigente'}
              <StatusPill estado={estadoVigencia(agencia)} />
            {/if}
          </div>
        </div>
      </div>
    {/if}

    <nav aria-label="Secciones del panel" class="relative -my-1 min-h-0 overflow-y-auto py-1">
      <ul
        class="relative grid gap-1 before:absolute before:inset-y-[22px] before:left-[21px] before:border-l-2 before:border-dashed
          before:border-sobre-bosque-2 before:opacity-55"
      >
        {#each SECCIONES as s}
          {@const activa = esActiva(path, s.ruta)}
          <li>
            <a
              href={'#' + s.ruta}
              aria-current={activa ? 'page' : undefined}
              class="relative flex min-h-14 items-center gap-3.5 rounded-full py-1 pr-2.5 pl-1.5 text-[17px] leading-tight no-underline
                transition-colors hover:bg-bosque-2 {activa ? 'font-bold' : 'font-semibold'}"
            >
              <span
                class="grid size-[34px] shrink-0 place-items-center rounded-full border-[1.5px]
                  {activa
                  ? 'border-sobre-bosque bg-heliconia text-sobre-heliconia shadow-[0_0_0_3px_var(--bosque)]'
                  : 'border-sobre-bosque-2 bg-bosque'}"
              >
                <Icono trazo={s.icono} clase="size-5" />
              </span>
              {s.etiqueta}
            </a>
          </li>
        {/each}
      </ul>
    </nav>
  </aside>

  <div class="flex min-w-0 flex-1 flex-col">
    <!-- Cabecera: niebla con curvas de nivel en el escritorio; barra oscura del monte en el celular -->
    <header class="relative z-30 bg-bosque text-sobre-bosque max-lg:sticky max-lg:top-0 max-lg:[--anillo:var(--foco-bosque)] lg:bg-linear-to-b lg:from-niebla-2 lg:to-niebla lg:text-tinta">
      <div class="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <Curvas
          clase="max-lg:-top-[60px] max-lg:-right-[60px] max-lg:h-[180px] max-lg:w-[360px] max-lg:text-sobre-bosque-2 max-lg:opacity-20
            lg:-top-[70px] lg:-right-10 lg:h-[300px] lg:w-[760px] lg:text-musgo lg:opacity-[0.34]"
        />
        <Bruma clase="max-lg:hidden" />
      </div>

      <div class="relative flex min-h-[60px] items-center gap-3 px-4 py-2 lg:min-h-0 lg:gap-6 lg:px-10 lg:pt-[18px] lg:pb-3.5">
        <a href="#/dashboard" class="flex min-w-0 flex-1 items-center gap-2.5 no-underline lg:hidden" aria-label="Diverso, panel de agencias, ir al resumen">
          <Logo size={34} />
          <span class="min-w-0">
            <b class="font-titulo block truncate text-[17px] leading-tight">{agencia?.nombre ?? 'Diverso'}</b>
            <small class="block text-[12.5px] leading-tight text-sobre-bosque-2">Diverso · Panel de agencias</small>
          </span>
        </a>

        <div class="hidden min-w-0 flex-1 lg:block">
          <div class="relative w-fit max-w-full">
            <p class="text-[13px] font-bold tracking-[0.08em] text-tinta-2 uppercase" data-migas>
              Panel{#if seccion}&nbsp;·&nbsp;<b>{seccion.etiqueta}</b>{/if}
            </p>
            <time datetime={hoy} class="font-titulo block text-[26px] leading-[1.1] font-bold">{fechaLarga(hoy)}</time>
            <!-- La hoja cuelga junto a la fecha; solo aparece cuando hay sitio entre la fecha y los controles. -->
            <Heliconia clase="-top-[26px] left-[calc(100%+16px)] hidden h-[88px] w-14 text-heliconia opacity-90 min-[1440px]:block" />
          </div>
        </div>

        <div class="flex items-center gap-3">
          <p class="prueba hidden ancho:inline-flex" role="status">
            <Icono trazo={ICONOS.info} clase="size-[17px]" />
            {MODO_PRUEBA}
          </p>
          <button
            type="button"
            class="boton-icono {CONTROL}"
            aria-pressed={oscuro}
            aria-label="Modo oscuro"
            onclick={alternarTema}
          >
            <Icono trazo={oscuro ? ICONOS.sol : ICONOS.luna} clase="size-5" />
          </button>
          <div class="relative" bind:this={contenedorUsuario}>
            <button
              type="button"
              bind:this={botonUsuario}
              class="boton-icono gap-2 text-[15px] font-bold lg:w-auto lg:px-4 {CONTROL}"
              aria-label="Mi cuenta"
              aria-expanded={menuUsuario}
              aria-controls="menu-usuario"
              aria-haspopup="true"
              onclick={() => (menuUsuario = !menuUsuario)}
            >
              <Icono trazo={ICONOS.usuario} clase="size-5" />
              <span class="max-lg:hidden">Mi cuenta</span>
              <Icono trazo={ICONOS.chevron} clase="size-5 max-lg:hidden" />
            </button>
            <div
              id="menu-usuario"
              hidden={!menuUsuario}
              class="absolute top-[calc(100%+8px)] right-0 z-40 w-60 rounded-hoja border border-linea bg-superficie p-2 text-tinta
                shadow-[0_18px_40px_-12px_rgb(0_0_0/0.35)] [--anillo:var(--foco)]"
            >
              <a href="#/legal/terminos-agencias" class={ITEM}>
                <Icono trazo={ICONOS.documento} />
                Términos y privacidad
              </a>
              <button type="button" class={ITEM} onclick={alternarTema}>
                <Icono trazo={oscuro ? ICONOS.sol : ICONOS.luna} />
                {oscuro ? 'Modo claro' : 'Modo oscuro'}
              </button>
              <div class="mt-1.5 border-t border-linea pt-1.5">
                <button type="button" class={ITEM} onclick={() => signOut()}>
                  <Icono trazo={ICONOS.salir} />
                  Cerrar sesión
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Hasta `ancho` el indicador de prueba no cabe junto a los controles: va en su propia franja bajo la cabecera. -->
      <p class="prueba relative w-full justify-center rounded-none border-0 border-t border-dashed py-[5px] text-[13px] ancho:hidden" role="status">
        <Icono trazo={ICONOS.info} clase="size-[15px]" />
        {MODO_PRUEBA}
      </p>
    </header>

    <!-- El Resumen muestra estos avisos arriba, con su acción: ahí el banner los repetiría. -->
    {#if aviso && !esActiva(path, '/dashboard')}
      <div class="px-5 py-3 text-[15px] leading-relaxed font-semibold lg:px-10 {TONOS_AVISO[aviso.tono]}" role="status">
        {aviso.texto}
      </div>
    {/if}

    <main id="principal" tabindex="-1" bind:this={principal} class="min-w-0 flex-1 outline-none max-lg:pb-[calc(76px+env(safe-area-inset-bottom))]">
      {@render children()}
    </main>

    <!-- Navegación inferior (celular): las cinco secciones al alcance del pulgar, sobre la zona segura del teléfono -->
    <nav
      class="fixed inset-x-0 bottom-0 z-30 border-t border-linea bg-superficie pb-[env(safe-area-inset-bottom)] lg:hidden"
      aria-label="Navegación inferior"
    >
      <svg class="absolute inset-x-0 -top-2.5 h-2.5 w-full fill-superficie stroke-linea" viewBox="0 0 390 10" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <path d="M0 8C40 1 80 9 130 5S220 1 262 6 350 9 390 3V10H0Z" vector-effect="non-scaling-stroke" />
      </svg>
      <ul class="grid h-[68px]" style="grid-template-columns: repeat({SECCIONES.length}, minmax(0, 1fr))">
        {#each SECCIONES as s}
          {@const activa = esActiva(path, s.ruta)}
          <li>
            <a
              href={'#' + s.ruta}
              aria-current={activa ? 'page' : undefined}
              class="flex h-full flex-col items-center gap-[3px] px-0.5 pt-[7px] text-center text-xs leading-[1.1] no-underline
                {activa ? 'font-extrabold text-tinta' : 'font-semibold text-tinta-2'}"
            >
              <span class="grid h-7 w-[50px] place-items-center rounded-full {activa ? 'bg-heliconia text-sobre-heliconia' : ''}">
                <Icono trazo={s.icono} clase="size-5" />
              </span>
              {s.corta ?? s.etiqueta}
            </a>
          </li>
        {/each}
      </ul>
    </nav>
  </div>
</div>
