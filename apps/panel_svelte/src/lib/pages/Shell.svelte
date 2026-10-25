<script lang="ts">
  import type { Snippet } from 'svelte';
  import Logo from '../components/Logo.svelte';
  import Avatar from '../components/Avatar.svelte';
  import StatusPill from '../components/StatusPill.svelte';
  import { auth, signOut } from '../auth.svelte';
  import { router } from '../router.svelte';
  import { miAgencia } from '../api';
  import { fechaTexto } from '../format';
  import { estadoVigencia, diasParaVencer, type Agency } from '../types';

  let { children }: { children: Snippet } = $props();

  let agencia = $state<Agency | null>(null);
  let menuAbierto = $state(false);
  let oscuro = $state(document.documentElement.classList.contains('dark'));

  $effect(() => {
    if (!auth.userId) return;
    // Se recarga al navegar para reflejar cambios de verificación sin F5.
    void router.path;
    miAgencia()
      .then((a) => (agencia = a))
      .catch(() => {});
  });

  // Cerrar el menú móvil al cambiar de sección.
  $effect(() => {
    void router.path;
    menuAbierto = false;
  });

  const secciones = [
    { ruta: '/dashboard', icono: 'M3 3h8v8H3V3zm10 0h8v5h-8V3zM3 13h8v8H3v-8zm10 3h8v5h-8v-5z', etiqueta: 'Resumen' },
    { ruta: '/planes', icono: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7', etiqueta: 'Planes' },
    { ruta: '/ventas', icono: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z', etiqueta: 'Ventas' },
  ];

  function activa(rutaSeccion: string): boolean {
    return router.path === rutaSeccion || router.path.startsWith(rutaSeccion + '/');
  }

  function alternarTema(): void {
    oscuro = document.documentElement.classList.toggle('dark');
    try {
      localStorage.setItem('diverso-panel-theme', oscuro ? 'dark' : 'light');
    } catch {
      /* almacenamiento no disponible: el tema solo dura esta sesión */
    }
  }

  /** Aviso principal sobre el estado de la agencia (uno a la vez, el más urgente). */
  const aviso = $derived.by((): { tono: 'alerta' | 'error' | 'info'; texto: string } | null => {
    const a = agencia;
    if (!a) return null;
    if (a.estado_verificacion === 'rechazado') {
      return {
        tono: 'error',
        texto: `La verificación de tu agencia fue rechazada${a.motivo_rechazo ? `: ${a.motivo_rechazo}` : '.'} Corrige tus datos y escríbenos para revisarla de nuevo.`,
      };
    }
    if (a.estado_verificacion === 'pendiente') {
      return {
        tono: 'info',
        texto: `Tu agencia está en verificación (RNT ${a.numero_rnt}). Puedes preparar planes como borrador; se publicarán cuando el equipo Diverso confirme tu registro.`,
      };
    }
    const est = estadoVigencia(a);
    if (est === 'vencido' || est === 'sin_vigencia') {
      return {
        tono: 'error',
        texto:
          est === 'vencido'
            ? 'El RNT de tu agencia está vencido: tus planes no se muestran ni reciben reservas. Renueva el registro y envíanos el soporte.'
            : 'Tu agencia no tiene registrada la vigencia del RNT, así que tus planes no se muestran. Envíanos el certificado vigente para habilitarla.',
      };
    }
    if (est === 'por_vencer') {
      return {
        tono: 'alerta',
        texto: `Tu RNT vence el ${fechaTexto(a.rnt_vigente_hasta!)} (en ${diasParaVencer(a)} ${diasParaVencer(a) === 1 ? 'día' : 'días'}). Renuévalo a tiempo para no dejar de vender.`,
      };
    }
    return null;
  });

  const TONOS = {
    info: 'bg-brand-600/10 text-brand-800 dark:text-brand-200',
    alerta: 'bg-orange-500/12 text-orange-800 dark:text-orange-300',
    error: 'bg-red-500/10 text-red-700 dark:text-red-300',
  } as const;
</script>

{#snippet navegacion()}
  <nav class="flex flex-col gap-0.5" aria-label="Secciones">
    {#each secciones as s}
      <a
        href={'#' + s.ruta}
        aria-current={activa(s.ruta) ? 'page' : undefined}
        class="flex items-center gap-3 rounded-[10px] px-3 py-2 text-[13.5px] transition-colors
          {activa(s.ruta)
          ? 'bg-brand-600/12 font-bold text-brand-700 dark:bg-brand-400/15 dark:text-brand-200'
          : 'font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-ink-700'}"
      >
        <svg class="size-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d={s.icono} />
        </svg>
        {s.etiqueta}
      </a>
    {/each}
  </nav>
{/snippet}

{#snippet pieMenu()}
  <div class="mb-1.5 border-t border-slate-200/80 dark:border-ink-600"></div>
  <a
    href="#/legal/terminos-agencias"
    class="flex w-full items-center gap-3 rounded-[10px] px-3 py-2 text-[13.5px] font-medium
      text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-ink-700"
  >
    <svg class="size-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 12h6m-6 4h6M7 3h7l5 5v11a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z"/></svg>
    Términos y privacidad
  </a>
  <button
    class="flex w-full items-center gap-3 rounded-[10px] px-3 py-2 text-[13.5px] font-medium
      text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-ink-700"
    onclick={alternarTema}
  >
    {#if oscuro}
      <svg class="size-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4l1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4m11.4-11.4l1.4-1.4"/></svg>
      Modo claro
    {:else}
      <svg class="size-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/></svg>
      Modo oscuro
    {/if}
  </button>
  <button
    class="flex w-full items-center gap-3 rounded-[10px] px-3 py-2 text-[13.5px] font-medium
      text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-ink-700"
    onclick={() => signOut()}
  >
    <svg class="size-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4m7 14l5-5-5-5m5 5H9"/></svg>
    Cerrar sesión
  </button>
{/snippet}

{#snippet tarjetaAgencia()}
  {#if agencia}
    <div
      class="flex items-center gap-2.5 rounded-xl border border-slate-200/80 bg-paper p-2.5
        dark:border-ink-600 dark:bg-ink-800"
    >
      <Avatar iniciales={agencia.nombre} tam={28} />
      <div class="min-w-0">
        <div class="truncate text-[12.5px] font-bold">{agencia.nombre}</div>
        <div class="mt-0.5 flex flex-wrap items-center gap-1">
          <StatusPill estado={agencia.estado_verificacion} />
          {#if agencia.estado_verificacion === 'verificado' && estadoVigencia(agencia) !== 'vigente'}
            <StatusPill estado={estadoVigencia(agencia)} />
          {/if}
        </div>
      </div>
    </div>
  {/if}
{/snippet}

<div class="flex min-h-screen">
  <!-- Barra lateral (escritorio) -->
  <aside
    class="sticky top-0 flex h-screen w-[236px] shrink-0 flex-col border-r border-slate-200/80 bg-white
      px-3 py-4 max-md:hidden dark:border-ink-600 dark:bg-ink-900"
  >
    <div class="flex items-center gap-2.5 px-1.5">
      <div class="flex size-9 items-center justify-center rounded-xl bg-brand-600 text-white">
        <Logo size={20} />
      </div>
      <div>
        <div class="text-[15px] font-extrabold tracking-tight">Diverso</div>
        <div class="text-[10.5px] text-slate-500 dark:text-slate-400">Panel de agencias</div>
      </div>
    </div>

    <div class="mt-4">{@render tarjetaAgencia()}</div>

    <div class="mt-5 mb-1.5 px-2 text-[10px] font-bold tracking-[0.1em] text-slate-400">GESTIÓN</div>
    {@render navegacion()}

    <div class="mt-auto">{@render pieMenu()}</div>
  </aside>

  <div class="flex min-w-0 flex-1 flex-col">
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
        {@render navegacion()}
        <div class="mt-2">{@render pieMenu()}</div>
      </div>
    {/if}

    {#if aviso}
      <div class="px-5 py-2.5 text-[13px] leading-relaxed {TONOS[aviso.tono]}" role="status">
        {aviso.texto}
      </div>
    {/if}

    <main class="min-w-0 flex-1 pb-20 md:pb-0">
      {@render children()}
    </main>

    <!-- Navegación inferior (móvil) -->
    <nav
      class="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t border-slate-200/80 bg-white/95
        pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden dark:border-ink-600 dark:bg-ink-900/95"
      aria-label="Secciones"
    >
      {#each secciones as s}
        <a
          href={'#' + s.ruta}
          aria-current={activa(s.ruta) ? 'page' : undefined}
          class="flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold
            {activa(s.ruta) ? 'text-brand-600 dark:text-brand-300' : 'text-slate-500 dark:text-slate-400'}"
        >
          <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d={s.icono} />
          </svg>
          {s.etiqueta}
        </a>
      {/each}
    </nav>
  </div>
</div>
