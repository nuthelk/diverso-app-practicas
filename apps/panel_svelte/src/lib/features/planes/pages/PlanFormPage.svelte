<script lang="ts">
  import Pagina from '$lib/shared/ui/Pagina.svelte';
  import Spinner from '$lib/shared/ui/Spinner.svelte';
  import { miAgencia } from '$lib/features/agencias/api/agencias.api';
  import { mensajeError } from '$lib/shared/api/errores';
  import { goto } from '$app/navigation';
  import { avisar } from '$lib/shared/lib/toast.svelte';
  import { misPlanes, crearPlan, actualizarPlan } from '../api/planes.api';
  import { draftDesdePlan, draftVacio, type PlanDraft } from '../model/plan';
  import { parsearDuracion, type Unidad } from '../model/duracion';
  import { textoPoliticaCompleto, validarPolitica } from '../model/politica';
  import EncabezadoPlan from '../components/plan-form/EncabezadoPlan.svelte';
  import SeccionEsencial from '../components/plan-form/SeccionEsencial.svelte';
  import SeccionDescripcion from '../components/plan-form/SeccionDescripcion.svelte';
  import SeccionIncluye from '../components/plan-form/SeccionIncluye.svelte';
  import SeccionItinerario from '../components/plan-form/SeccionItinerario.svelte';
  import SeccionEncuentro from '../components/plan-form/SeccionEncuentro.svelte';

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
  <div class="grid min-h-[60vh] place-items-center" role="status" aria-label="Cargando">
    <Spinner />
  </div>
{:else}
  <Pagina ancho={820}>
    <EncabezadoPlan {planId} {guardando} />

    <form id="form-plan" class="mt-5 space-y-4" onsubmit={guardar}>
      <SeccionEsencial bind:d bind:duracionCantidad bind:duracionUnidad />
      <SeccionDescripcion bind:d />
      <SeccionIncluye bind:d />
      <SeccionItinerario bind:d />
      <SeccionEncuentro bind:d errores={erroresPolitica} {intentado} {textoVistaPrevia} />

      {#if error}
        <p class="text-[13px] font-medium text-error-ink" role="alert">{error}</p>
      {/if}
      <p class="pb-4 text-[12px] text-suave">
        * El precio es final: lo que ve el viajero es lo que paga, sin cargos ocultos (Anexo 4).
      </p>
    </form>
  </Pagina>
{/if}
