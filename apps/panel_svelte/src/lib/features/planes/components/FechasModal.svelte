<script lang="ts">
  import Icono from '$lib/shared/ui/Icono.svelte';
  import { ICONOS } from '$lib/shared/ui/iconos';
  import { agregarFecha, eliminarFecha } from '../api/planes.api';
  import { mensajeError } from '$lib/shared/api/errores';
  import { fechaCorta, hoyISO } from '$lib/shared/lib/format';
  import type { Plan } from '../model/plan';
  import { avisar } from '$lib/shared/lib/toast.svelte';

  let { plan, oncerrar }: { plan: Plan; oncerrar: () => void } = $props();

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
      oncerrar();
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
      oncerrar();
    } catch (e) {
      avisar(mensajeError(e));
    }
  }
</script>

<!-- Modal de fechas y cupos -->
<div
  class="fixed inset-0 z-40 grid place-items-center bg-ink-950/45 p-4 backdrop-blur-[2px]"
  role="presentation"
  onclick={(e) => e.target === e.currentTarget && oncerrar()}
  onkeydown={(e) => e.key === 'Escape' && oncerrar()}
>
  <div
    class="tarjeta aparecer max-h-full w-full max-w-[480px] overflow-y-auto rounded-[22px] p-6 shadow-2xl shadow-slate-900/20 dark:shadow-black/60"
    role="dialog"
    aria-modal="true"
    aria-labelledby="fechas-titulo"
  >
    <div class="flex items-start gap-3">
      <div class="min-w-0 flex-1">
        <h3 id="fechas-titulo" class="text-[18px] font-extrabold tracking-tight">Fechas y cupos</h3>
        <p class="mt-0.5 truncate text-[13px] text-suave">{plan.titulo}</p>
      </div>
      <button type="button" class="boton-icono -mt-1" aria-label="Cerrar ventana" onclick={oncerrar}>
        <Icono trazo={ICONOS.cerrar} clase="size-4" />
      </button>
    </div>

    <form class="mt-5 flex flex-wrap items-end gap-2.5" onsubmit={agregar}>
      <label class="min-w-[150px] flex-1">
        <span class="etiqueta-campo">Fecha</span>
        <input type="date" required min={hoyISO()} bind:value={fecha} class="campo" />
      </label>
      <label class="w-24">
        <span class="etiqueta-campo">Cupo</span>
        <input type="number" required min="1" max="40" bind:value={cupo} class="campo" />
      </label>
      <button type="submit" disabled={guardando} class="btn btn-primario h-[42px]">Agregar</button>
    </form>
    {#if error}
      <p class="mt-2 text-[12.5px] font-medium text-error-ink" role="alert">{error}</p>
    {/if}

    <ul class="mt-4 max-h-[280px] space-y-1.5 overflow-y-auto">
      {#each fechas as f (f.id)}
        <li class="flex items-center gap-3 rounded-xl border border-linea px-3.5 py-2">
          <span class="text-[13.5px] font-bold">{fechaCorta(f.fecha)}</span>
          <span class="text-[12px] text-suave">{f.cupo_disponible}/{f.cupo_total} cupos libres</span>
          <button
            type="button"
            class="ml-auto grid size-7 place-items-center rounded-lg text-suave transition-colors hover:bg-error-ink/10 hover:text-error-ink"
            title="Eliminar fecha"
            aria-label="Eliminar fecha"
            onclick={() => quitar(f.id)}
          >
            <Icono trazo={ICONOS.cerrar} clase="size-3.5" />
          </button>
        </li>
      {:else}
        <li class="py-6 text-center text-[13px] text-suave">Sin fechas todavía — agrega la primera.</li>
      {/each}
    </ul>

    <div class="mt-5 flex justify-end">
      <button class="btn btn-secundario" onclick={oncerrar}>Cerrar</button>
    </div>
  </div>
</div>
