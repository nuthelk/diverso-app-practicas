<script lang="ts">
  import type { Snippet } from 'svelte';
  import Logo from '../components/Logo.svelte';
  import Avatar from '../components/Avatar.svelte';
  import StatusPill from '../components/StatusPill.svelte';
  import { auth, signOut } from '../auth.svelte';
  import { router } from '../router.svelte';
  import { miAgencia } from '../api';
  import type { Agency } from '../types';

  let { children }: { children: Snippet } = $props();

  let agencia = $state<Agency | null>(null);

  $effect(() => {
    if (!auth.userId) return;
    miAgencia()
      .then((a) => (agencia = a))
      .catch(() => {});
  });

  const secciones = [
    { ruta: '/dashboard', icono: 'M3 3h8v8H3V3zm10 0h8v5h-8V3zM3 13h8v8H3v-8zm10 3h8v5h-8v-5z', etiqueta: 'Dashboard' },
    { ruta: '/planes', icono: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7', etiqueta: 'Planes' },
    { ruta: '/ventas', icono: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z', etiqueta: 'Ventas' },
  ];

  function activa(rutaSeccion: string): boolean {
    return router.path === rutaSeccion || router.path.startsWith(rutaSeccion + '/');
  }

  function alternarTema(): void {
    const raiz = document.documentElement;
    const claro = raiz.classList.toggle('dark') === false;
    localStorage.setItem('diverso-panel-theme', claro ? 'light' : 'dark');
  }

  const oscuro = $derived(document.documentElement.classList.contains('dark'));
</script>

<div class="flex min-h-screen">
  <!-- Sidebar -->
  <aside
    class="flex w-[236px] shrink-0 flex-col border-r border-slate-200/80 bg-white px-3 py-4
      dark:border-ink-600 dark:bg-ink-900 max-md:hidden"
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

    {#if agencia}
      <div
        class="mt-4 flex items-center gap-2.5 rounded-xl border border-slate-200/80 bg-paper p-2.5
          dark:border-ink-600 dark:bg-ink-800"
      >
        <Avatar iniciales={agencia.nombre} tam={28} />
        <div class="min-w-0">
          <div class="truncate text-[12.5px] font-bold">{agencia.nombre}</div>
          <div class="mt-0.5"><StatusPill estado={agencia.estado_verificacion} /></div>
        </div>
      </div>
    {/if}

    <div class="mt-5 mb-1.5 px-2 text-[10px] font-bold tracking-[0.1em] text-slate-400">
      GESTIÓN
    </div>

    <nav class="flex flex-col gap-0.5">
      {#each secciones as s}
        <a
          href={'#' + s.ruta}
          class="flex items-center gap-3 rounded-[10px] px-3 py-2 text-[13.5px] transition-colors
            {activa(s.ruta)
            ? 'bg-brand-600/12 font-bold text-brand-700 dark:bg-brand-400/15 dark:text-brand-200'
            : 'font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-ink-700'}"
        >
          <svg class="size-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d={s.icono} />
          </svg>
          {s.etiqueta}
        </a>
      {/each}
    </nav>

    <div class="mt-auto">
      <div class="mb-1.5 border-t border-slate-200/80 dark:border-ink-600"></div>
      <button
        class="flex w-full items-center gap-3 rounded-[10px] px-3 py-2 text-[13.5px] font-medium
          text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-ink-700"
        onclick={alternarTema}
      >
        {#if oscuro}
          <svg class="size-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4l1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4m11.4-11.4l1.4-1.4"/></svg>
          Modo claro
        {:else}
          <svg class="size-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/></svg>
          Modo oscuro
        {/if}
      </button>
      <button
        class="flex w-full items-center gap-3 rounded-[10px] px-3 py-2 text-[13.5px] font-medium
          text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-ink-700"
        onclick={() => signOut()}
      >
        <svg class="size-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4m7 14l5-5-5-5m5 5H9"/></svg>
        Cerrar sesión
      </button>
    </div>
  </aside>

  <!-- Contenido -->
  <div class="flex min-w-0 flex-1 flex-col">
    {#if agencia?.estado_verificacion === 'pendiente'}
      <div class="bg-orange-500/12 px-5 py-2.5 text-[13px] text-orange-700 dark:text-orange-400">
        Tu agencia está en verificación (RNT {agencia.numero_rnt}). Puedes crear planes como
        borrador; se publicarán cuando el equipo Diverso verifique tu registro.
      </div>
    {/if}
    <main class="min-w-0 flex-1">
      {@render children()}
    </main>
  </div>
</div>
