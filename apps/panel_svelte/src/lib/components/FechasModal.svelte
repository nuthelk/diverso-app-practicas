<script lang="ts">
  import { agregarFecha, eliminarFecha, mensajeError } from '../api';
  import { fechaCorta, hoyISO } from '../format';
  import type { Plan } from '../types';
  import { avisar } from '../toast.svelte';

  let { plan, oncCerrar }: { plan: Plan; oncCerrar: () => void } = $props();

  let fecha = $state('');
  let cupo = $state<number | ''>(12);
  let guardando = $state(false);
  let error = $state('');

  const fechas = $derived([...plan.plan_dates].sort((a, b) => b.fecha.localeCompare(a.fecha)));

  async function agregar(e: SubmitEvent) {
    e.preventDefault();
    if (!fecha || !cupo || cupo <= 0) return;
    guardando = true;
    error = '';
    try {
      await agregarFecha(plan.id, fecha, Number(cupo));
      avisar('Fecha agregada.');
      fecha = '';
      oncCerrar();
    } catch (e) {
      error = mensajeError(e);
    } finally {
      guardando = false;
    }
  }

  async function quitar(id: string) {
    try {
      await eliminarFecha(id);
      avisar('Fecha eliminada y cupos liberados.');
      oncCerrar();
    } catch (e) {
      avisar(mensajeError(e));
    }
  }
</script>

<!-- Modal de fechas y cupos -->
<div
  class="fixed inset-0 z-40 grid place-items-center bg-black/45 p-4 backdrop-blur-[2px]"
  role="presentation"
  onclick={(e) => e.target === e.currentTarget && oncCerrar()}
  onkeydown={(e) => e.key === 'Escape' && oncCerrar()}
>
  <div
    class="aparecer w-full max-w-[480px] rounded-3xl border border-slate-200/80 bg-white p-6 shadow-2xl
      dark:border-ink-600 dark:bg-ink-800"
    role="dialog"
    aria-modal="true"
  >
    <h3 class="text-[18px] font-extrabold tracking-tight">Fechas y cupos</h3>
    <p class="mt-0.5 truncate text-[13px] text-slate-500 dark:text-slate-400">{plan.titulo}</p>

    <form class="mt-5 flex items-end gap-2.5" onsubmit={agregar}>
      <label class="flex-1">
        <span class="mb-1 block text-[11.5px] font-semibold text-slate-500 dark:text-slate-400"
          >Fecha</span
        >
        <input type="date" required min={hoyISO()} bind:value={fecha} class="campo" />
      </label>
      <label class="w-24">
        <span class="mb-1 block text-[11.5px] font-semibold text-slate-500 dark:text-slate-400"
          >Cupo</span
        >
        <input type="number" required min="1" max="40" bind:value={cupo} class="campo" />
      </label>
      <button
        type="submit"
        disabled={guardando}
        class="h-[42px] rounded-xl bg-brand-600 px-4 text-[13.5px] font-bold text-white transition
          hover:bg-brand-500 disabled:opacity-60"
      >
        Agregar
      </button>
    </form>
    {#if error}
      <p class="mt-2 text-[12.5px] font-medium text-red-600">{error}</p>
    {/if}

    <div class="mt-4 max-h-[280px] space-y-1.5 overflow-y-auto">
      {#each fechas as f (f.id)}
        <div
          class="flex items-center gap-3 rounded-xl border border-slate-200/70 px-3.5 py-2
            dark:border-ink-600"
        >
          <span class="text-[13.5px] font-bold">{fechaCorta(f.fecha)}</span>
          <span class="text-[12px] text-slate-500 dark:text-slate-400">
            {f.cupo_disponible}/{f.cupo_total} cupos libres
          </span>
          <button
            class="ml-auto text-slate-400 transition hover:text-red-600"
            title="Eliminar fecha"
            onclick={() => quitar(f.id)}
          >
            ✕
          </button>
        </div>
      {:else}
        <p class="py-6 text-center text-[13px] text-slate-500 dark:text-slate-400">
          Sin fechas todavía — agrega la primera.
        </p>
      {/each}
    </div>

    <div class="mt-5 flex justify-end">
      <button
        class="rounded-full bg-slate-100 px-5 py-2 text-[13.5px] font-bold text-slate-700 transition
          hover:bg-slate-200 dark:bg-ink-700 dark:text-slate-200 dark:hover:bg-ink-600"
        onclick={oncCerrar}
      >
        Cerrar
      </button>
    </div>
  </div>
</div>

<style>
  .campo {
    width: 100%;
    border-radius: 12px;
    border: 1px solid rgb(0 0 0 / 0.1);
    background: rgb(0 0 0 / 0.03);
    padding: 8px 12px;
    font-size: 13.5px;
    outline: none;
  }
  :global(.dark) .campo {
    border-color: rgb(255 255 255 / 0.09);
    background: rgb(255 255 255 / 0.04);
  }
  .campo:focus {
    border-color: var(--color-brand-400);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-brand-400) 25%, transparent);
  }
</style>
