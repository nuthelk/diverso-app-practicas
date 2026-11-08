<script lang="ts">
  import AlertaError from '$lib/shared/ui/AlertaError.svelte';
  import Campo from '$lib/shared/ui/Campo.svelte';
  import Dialogo from '$lib/shared/ui/Dialogo.svelte';
  import Icono from '$lib/shared/ui/Icono.svelte';
  import { ICONOS } from '$lib/shared/ui/iconos';
  import { agregarFecha, eliminarFecha } from '../api/planes.api';
  import { mensajeError } from '$lib/shared/api/errores';
  import { confirmar } from '$lib/shared/lib/confirmar.svelte';
  import { fechaCorta, fechaTexto, hoyISO } from '$lib/shared/lib/format';
  import { yaSalio, type Plan, type PlanDate } from '../model/plan';
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

  async function quitar(f: PlanDate) {
    const seguir = await confirmar({
      titulo: `¿Eliminar la fecha del ${fechaTexto(f.fecha)}?`,
      mensaje:
        'Se eliminará la fecha con sus cupos y dejará de estar disponible para reservar. Si ya tiene reservas activas, no se podrá eliminar.',
      confirmar: 'Eliminar fecha',
      peligro: true,
    });
    if (!seguir) return;
    error = '';
    try {
      await eliminarFecha(f.id);
      avisar('Fecha eliminada y cupos liberados.');
      oncerrar();
    } catch (e) {
      error = mensajeError(e);
    }
  }
</script>

<Dialogo abierto titulo="Fechas y cupos" descripcion={plan.titulo} {oncerrar}>
  <form class="flex flex-wrap items-end gap-3" onsubmit={agregar}>
    <Campo etiqueta="Fecha" clase="min-w-40 flex-1">
      {#snippet control(atributos)}
        <input {...atributos} type="date" required min={hoyISO()} bind:value={fecha} class="campo cifra" />
      {/snippet}
    </Campo>
    <Campo etiqueta="Cupo" clase="w-24">
      {#snippet control(atributos)}
        <input {...atributos} type="number" required min="1" max="40" bind:value={cupo} class="campo cifra" />
      {/snippet}
    </Campo>
    <button type="submit" disabled={guardando} class="btn btn-primario">Agregar</button>
  </form>
  {#if error}
    <AlertaError clase="mt-3">{error}</AlertaError>
  {/if}

  <ul class="mt-4">
    {#each fechas as f (f.id)}
      <li class="flex items-center gap-3 border-t border-linea py-2 first:border-t-0">
        <div class="min-w-0 flex-1">
          <p class="flex flex-wrap items-center gap-x-2">
            <span class="cifra text-destacado">{fechaCorta(f.fecha)}</span>
            {#if yaSalio(plan, f)}<span class="pildora pildora-neutra">Ya salió</span>{/if}
          </p>
          <p class="text-detalle text-tinta-2"><span class="cifra">{f.cupo_disponible} de {f.cupo_total}</span> cupos libres</p>
        </div>
        <button
          type="button"
          class="grid size-11 shrink-0 place-items-center rounded-pildora text-tinta-2 transition-colors hover:bg-heliconia-bg hover:text-heliconia"
          title="Eliminar fecha"
          aria-label="Eliminar la fecha del {fechaTexto(f.fecha)}"
          onclick={() => quitar(f)}
        >
          <Icono trazo={ICONOS.papelera} clase="size-4" />
        </button>
      </li>
    {:else}
      <li class="py-6 text-center text-tinta-2">Sin fechas todavía — agrega la primera.</li>
    {/each}
  </ul>

  {#snippet pie()}
    <button type="button" class="btn btn-secundario" onclick={oncerrar}>Listo</button>
  {/snippet}
</Dialogo>
