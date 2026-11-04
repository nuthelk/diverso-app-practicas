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
  class="fixed inset-0 z-40 grid place-items-center bg-bosque/60 p-4 backdrop-blur-[2px]"
  role="presentation"
  onclick={(e) => e.target === e.currentTarget && oncerrar()}
  onkeydown={(e) => e.key === 'Escape' && oncerrar()}
>
  <div
    class="tarjeta aparecer max-h-full w-full max-w-[480px] overflow-y-auto rounded-hoja-grande p-6 shadow-[0_24px_60px_-20px_rgb(0_0_0/0.5)] sm:p-7"
    role="dialog"
    aria-modal="true"
    aria-labelledby="fechas-titulo"
  >
    <div class="flex items-start gap-3">
      <div class="min-w-0 flex-1">
        <h3 id="fechas-titulo" class="text-[26px] leading-[1.15]">Fechas y cupos</h3>
        <p class="font-titulo mt-0.5 truncate text-[17px] text-tinta-2">{plan.titulo}</p>
      </div>
      <button type="button" class="boton-icono -mt-1" aria-label="Cerrar ventana" onclick={oncerrar}>
        <Icono trazo={ICONOS.cerrar} clase="size-4" />
      </button>
    </div>

    <form class="mt-5 flex flex-wrap items-end gap-2.5" onsubmit={agregar}>
      <label class="min-w-[150px] flex-1">
        <span class="etiqueta-campo">Fecha</span>
        <input type="date" required min={hoyISO()} bind:value={fecha} class="campo cifra text-[17px]" />
      </label>
      <label class="w-24">
        <span class="etiqueta-campo">Cupo</span>
        <input type="number" required min="1" max="40" bind:value={cupo} class="campo cifra text-[17px]" />
      </label>
      <button type="submit" disabled={guardando} class="btn btn-primario">Agregar</button>
    </form>
    {#if error}
      <p class="mt-2 text-[15px] font-semibold text-heliconia" role="alert">{error}</p>
    {/if}

    <ul class="mt-4 max-h-[280px] space-y-1.5 overflow-y-auto">
      {#each fechas as f (f.id)}
        <li class="flex items-center gap-3 rounded-hoja-chica border border-linea bg-niebla px-3.5 py-2">
          <span class="cifra text-[18px]">{fechaCorta(f.fecha)}</span>
          <span class="text-[14px] text-tinta-2"><span class="cifra text-[16px]">{f.cupo_disponible}/{f.cupo_total}</span> cupos libres</span>
          <button
            type="button"
            class="ml-auto grid size-11 place-items-center rounded-full text-tinta-2 transition-colors hover:bg-heliconia-bg hover:text-heliconia"
            title="Eliminar fecha"
            aria-label="Eliminar fecha"
            onclick={() => quitar(f.id)}
          >
            <Icono trazo={ICONOS.cerrar} clase="size-4" />
          </button>
        </li>
      {:else}
        <li class="py-6 text-center text-[15px] text-tinta-2">Sin fechas todavía — agrega la primera.</li>
      {/each}
    </ul>

    <div class="mt-5 flex justify-end">
      <button class="btn btn-secundario" onclick={oncerrar}>Cerrar</button>
    </div>
  </div>
</div>
