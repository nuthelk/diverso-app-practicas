<script lang="ts">
  import { miAgencia } from '$lib/features/agencias/agencias.api';
  import { mensajeError } from '$lib/shared/api/errores';
  import { goto } from '$app/navigation';
  import { avisar } from '$lib/shared/lib/toast.svelte';
  import { misPlanes, crearPlan, actualizarPlan } from './planes.api';
  import { draftDesdePlan, draftVacio, type PlanDraft } from './plan';
  import { parsearDuracion, type Unidad } from './duracion';
  import { textoPoliticaCompleto, validarPolitica } from './politica';
  import EncabezadoPlan from './components/plan-form/EncabezadoPlan.svelte';
  import SeccionEsencial from './components/plan-form/SeccionEsencial.svelte';
  import SeccionDescripcion from './components/plan-form/SeccionDescripcion.svelte';
  import SeccionIncluye from './components/plan-form/SeccionIncluye.svelte';
  import SeccionItinerario from './components/plan-form/SeccionItinerario.svelte';
  import SeccionEncuentro from './components/plan-form/SeccionEncuentro.svelte';

  let { planId }: { planId?: string } = $props();

  let d = $state<PlanDraft>(draftVacio());
  let cargando = $state(!!planId);
  let guardando = $state(false);
  let error = $state('');
  let intentado = $state(false);

  // Duración estructurada: cantidad + unidad → compone duracionTexto (lo hace SeccionEsencial).
  let duracionCantidad = $state<number | null>(1);
  let duracionUnidad = $state<Unidad>('dias');

  $effect(() => {
    if (!planId) return;
    (async () => {
      try {
        const agencia = await miAgencia();
        const planes = agencia ? await misPlanes(agencia.id) : [];
        const p = planes.find((x) => x.id === planId);
        if (p) {
          d = draftDesdePlan(p);
          ({ cantidad: duracionCantidad, unidad: duracionUnidad } = parsearDuracion(p.duracion_texto));
        }
      } catch (e) {
        error = mensajeError(e);
      } finally {
        cargando = false;
      }
    })();
  });

  // El texto de la política se genera siempre desde estos números (planes.api.ts lo vuelve a generar al guardar).
  const erroresPolitica = $derived(validarPolitica(d));
  const politicaValida = $derived(Object.keys(erroresPolitica).length === 0);
  const textoVistaPrevia = $derived(
    politicaValida ? textoPoliticaCompleto(d) : 'Completa la política de cancelación para ver el texto que leerá el viajero.',
  );

  async function guardar(e: SubmitEvent) {
    e.preventDefault();
    intentado = true;
    if (d.precioCop <= 0) {
      error = 'El precio debe ser mayor a 0.';
      return;
    }
    if (!politicaValida) {
      error = Object.values(erroresPolitica)[0] ?? 'Revisa la política de cancelación.';
      return;
    }
    guardando = true;
    error = '';
    try {
      const agencia = await miAgencia();
      if (!agencia) throw new Error('No se encontró tu agencia.');
      if (d.id == null) {
        await crearPlan(agencia.id, d);
        avisar('Plan creado como borrador.');
      } else {
        await actualizarPlan(d);
        avisar('Plan guardado.');
      }
      goto('#/planes');
    } catch (e) {
      error = mensajeError(e);
    } finally {
      guardando = false;
    }
  }
</script>

{#if cargando}
  <div class="grid min-h-[60vh] place-items-center">
    <div class="size-7 animate-spin rounded-full border-2 border-brand-600 border-t-transparent"></div>
  </div>
{:else}
  <div class="mx-auto max-w-[820px] px-6 pb-20">
    <EncabezadoPlan {planId} {guardando} />

    <form id="form-plan" class="plan-form space-y-4" onsubmit={guardar}>
      <SeccionEsencial bind:d bind:duracionCantidad bind:duracionUnidad />
      <SeccionDescripcion bind:d />
      <SeccionIncluye bind:d />
      <SeccionItinerario bind:d />
      <SeccionEncuentro bind:d errores={erroresPolitica} {intentado} {textoVistaPrevia} />

      {#if error}
        <p class="text-[13px] font-medium text-red-600">{error}</p>
      {/if}
      <p class="pb-4 text-[12px] text-slate-400">
        * El precio es final: lo que ve el viajero es lo que paga, sin cargos ocultos (Anexo 4).
      </p>
    </form>
  </div>
{/if}

<style>
  .plan-form :global(.etiqueta) {
    display: block;
    margin-bottom: 6px;
    font-size: 12px;
    font-weight: 600;
    color: rgb(71 85 105);
  }
  :global(.dark) .plan-form :global(.etiqueta) {
    color: rgb(148 163 184);
  }
  .plan-form :global(.campo) {
    width: 100%;
    border-radius: 12px;
    border: 1px solid rgb(0 0 0 / 0.1);
    background: rgb(0 0 0 / 0.03);
    padding: 9px 14px;
    font-size: 14px;
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  :global(.dark) .plan-form :global(.campo) {
    border-color: rgb(255 255 255 / 0.09);
    background: rgb(255 255 255 / 0.04);
  }
  .plan-form :global(.campo:focus) {
    border-color: var(--color-brand-400);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-brand-400) 25%, transparent);
  }
  .plan-form :global(.switch) {
    appearance: none;
    width: 38px;
    height: 22px;
    border-radius: 999px;
    background: rgb(0 0 0 / 0.15);
    position: relative;
    cursor: pointer;
    transition: background 0.2s;
  }
  .plan-form :global(.switch)::after {
    content: '';
    position: absolute;
    top: 3px;
    left: 3px;
    width: 16px;
    height: 16px;
    border-radius: 999px;
    background: white;
    transition: left 0.2s;
    box-shadow: 0 1px 3px rgb(0 0 0 / 0.3);
  }
  .plan-form :global(.switch):checked {
    background: var(--color-brand-600);
  }
  .plan-form :global(.switch):checked::after {
    left: 19px;
  }
</style>
