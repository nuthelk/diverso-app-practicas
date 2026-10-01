<script lang="ts">
  import Logo from '../components/Logo.svelte';
  import Skeleton from '../components/Skeleton.svelte';
  import StatusPill from '../components/StatusPill.svelte';
  import Avatar from '../components/Avatar.svelte';
  import Empty from '../components/Empty.svelte';
  import { todasLasAgencias, cambiarVerificacion, mensajeError } from '../api';
  import { signOut } from '../auth.svelte';
  import { auth } from '../auth.svelte';
  import { avisar } from '../toast.svelte';
  import type { Agency } from '../types';

  let cargando = $state(true);
  let error = $state('');
  let agencias = $state<Agency[]>([]);

  async function cargar() {
    cargando = true;
    error = '';
    try {
      agencias = await todasLasAgencias();
    } catch (e) {
      error = mensajeError(e);
    } finally {
      cargando = false;
    }
  }

  $effect(() => {
    cargar();
  });

  async function decidir(a: Agency, estado: 'verificado' | 'rechazado') {
    try {
      await cambiarVerificacion(a.id, estado);
      avisar(`${a.nombre} → ${estado === 'verificado' ? 'verificada ✓' : 'rechazada'}`);
      await cargar();
    } catch (e) {
      avisar(mensajeError(e));
    }
  }

  const pendientes = $derived(agencias.filter((a) => a.estado_verificacion === 'pendiente').length);
</script>

<div class="min-h-screen">
  <header
    class="flex items-center gap-3 border-b border-slate-200/80 bg-white px-7 py-3
      dark:border-ink-600 dark:bg-ink-900"
  >
    <div class="flex size-9 items-center justify-center rounded-xl bg-brand-600 text-white">
      <Logo size={20} />
    </div>
    <div class="text-[15px] font-extrabold tracking-tight">Diverso · Administración</div>
    <div class="flex-1"></div>
    <span class="text-[12.5px] text-slate-400">{auth.email}</span>
    <button
      class="rounded-full px-4 py-1.5 text-[13px] font-semibold text-slate-600 transition
        hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-ink-700"
      onclick={() => signOut()}
    >
      Cerrar sesión
    </button>
  </header>

  <div class="mx-auto max-w-[1000px] px-7 py-7">
    <h1 class="text-[26px] font-extrabold tracking-tight">Verificación de agencias</h1>
    <p class="mt-1 text-[13.5px] text-slate-500 dark:text-slate-400">
      {pendientes} en espera · valida el RNT en el registro del MinCIT y la matrícula en la Cámara
      de Comercio antes de aprobar.
    </p>

    {#if cargando}
      <div class="mt-6 space-y-3">
        {#each Array(4) as _}<Skeleton clase="h-[150px]" />{/each}
      </div>
    {:else if error}
      <Empty icono="📡" titulo="Error" mensaje={error} />
    {:else}
      <div class="mt-6 space-y-3">
        {#each agencias as a (a.id)}
          <div
            class="rounded-2xl border border-slate-200/80 bg-white p-5
              dark:border-ink-600 dark:bg-ink-800"
          >
            <div class="flex items-center gap-3">
              <Avatar iniciales={a.nombre} tam={38} />
              <div class="min-w-0 flex-1 truncate text-[15px] font-extrabold">{a.nombre}</div>
              <StatusPill estado={a.estado_verificacion} />
            </div>
            <div class="mt-2.5 text-[12.5px] text-slate-500 dark:text-slate-400">
              RNT {a.numero_rnt} · Matrícula {a.matricula_camara_comercio} · {a.ciudad}
            </div>
            {#if a.telefono || a.email}
              <div class="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400">
                {a.telefono} {a.email}
              </div>
            {/if}
            {#if a.descripcion}
              <p class="mt-1.5 line-clamp-2 text-[12.5px] text-slate-400">{a.descripcion}</p>
            {/if}
            {#if a.estado_verificacion === 'pendiente'}
              <div class="mt-4 flex justify-end gap-2.5 border-t border-slate-200/70 pt-4 dark:border-ink-600">
                <button
                  class="rounded-full border border-red-300 px-4 py-1.5 text-[13px] font-bold
                    text-red-600 transition hover:bg-red-50 dark:border-red-500/40 dark:hover:bg-red-500/10"
                  onclick={() => decidir(a, 'rechazado')}
                >
                  ✕ Rechazar
                </button>
                <button
                  class="rounded-full bg-brand-600 px-4 py-1.5 text-[13px] font-bold text-white
                    transition hover:bg-brand-500"
                  onclick={() => decidir(a, 'verificado')}
                >
                  ✓ Verificar
                </button>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>
