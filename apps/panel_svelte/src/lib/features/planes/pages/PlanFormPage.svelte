<script lang="ts">
  import { tick } from 'svelte';
  import EsqueletoPagina from '$lib/shared/ui/EsqueletoPagina.svelte';
  import Empty from '$lib/shared/ui/Empty.svelte';
  import Icono from '$lib/shared/ui/Icono.svelte';
  import { ICONOS } from '$lib/shared/ui/iconos';
  import Pagina from '$lib/shared/ui/Pagina.svelte';
  import { miAgencia } from '$lib/features/agencias/api/agencias.api';
  import { mensajeError } from '$lib/shared/api/errores';
  import { goto } from '$app/navigation';
  import { avisar } from '$lib/shared/lib/toast.svelte';
  import { misPlanes, crearPlan, actualizarPlan } from '../api/planes.api';
  import { draftDesdePlan, draftVacio, errorPrecio, type PlanDraft } from '../model/plan';
  import { parsearDuracion, type Unidad } from '../model/duracion';
  import { textoPoliticaCompleto, validarPolitica } from '../model/politica';
  import EncabezadoPlan from '../components/plan-form/EncabezadoPlan.svelte';
  import SeccionEsencial from '../components/plan-form/SeccionEsencial.svelte';
  import SeccionDescripcion from '../components/plan-form/SeccionDescripcion.svelte';
  import SeccionIncluye from '../components/plan-form/SeccionIncluye.svelte';
  import SeccionItinerario from '../components/plan-form/SeccionItinerario.svelte';
  import SeccionEncuentro from '../components/plan-form/SeccionEncuentro.svelte';

  let { planId }: { planId?: string } = $props();

  const uid = $props.id();

  let d = $state<PlanDraft>(draftVacio());
  let cargando = $state(!!planId);
  let guardando = $state(false);
  /** No se pudo abrir el plan a editar: no se muestra el formulario (guardarlo vacío crearía otro plan). */
  let errorCarga = $state('');
  /** El servidor rechazó el guardado; lo escrito sigue en el formulario. */
  let errorServidor = $state('');
  let intentado = $state(false);
  let resumenEl = $state<HTMLElement | null>(null);
  let formEl = $state<HTMLFormElement | null>(null);

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
        } else {
          errorCarga = 'No encontramos este plan. Puede que se haya eliminado.';
        }
      } catch (e) {
        errorCarga = mensajeError(e);
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

  const errorDePrecio = $derived(intentado ? errorPrecio(d.precioCop) : undefined);

  /** Los puntos por corregir, en el orden del formulario; `campo` es el `data-campo` del control. */
  const pendientes = $derived.by(() => {
    if (!intentado) return [];
    const lista: { campo: string; mensaje: string }[] = [];
    if (errorDePrecio) lista.push({ campo: 'precio', mensaje: errorDePrecio });
    for (const [campo, mensaje] of Object.entries(erroresPolitica)) lista.push({ campo, mensaje });
    return lista;
  });

  async function mostrarResumen() {
    await tick();
    resumenEl?.focus();
  }

  function irAlCampo(campo: string) {
    formEl?.querySelector<HTMLElement>(`[data-campo="${campo}"]`)?.focus();
  }

  async function guardar(e: SubmitEvent) {
    e.preventDefault();
    intentado = true;
    errorServidor = '';
    if (errorPrecio(d.precioCop) || !politicaValida) {
      mostrarResumen();
      return;
    }
    guardando = true;
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
      errorServidor = mensajeError(e);
      mostrarResumen();
    } finally {
      guardando = false;
    }
  }
</script>

{#if cargando}
  <EsqueletoPagina ancho={820} filas={4} clase="h-40" />
{:else if errorCarga}
  <Pagina ancho={820}>
    <div class="tarjeta">
      <Empty icono="alerta" titulo="No pudimos abrir el plan" mensaje={errorCarga}>
        <a href="#/planes" class="btn btn-secundario">Volver a planes</a>
      </Empty>
    </div>
  </Pagina>
{:else}
  <Pagina ancho={820}>
    <EncabezadoPlan {planId} {guardando} />

    {#if pendientes.length > 0 || errorServidor}
      <div
        bind:this={resumenEl}
        role="group"
        aria-labelledby="{uid}-resumen"
        tabindex="-1"
        class="mt-5 rounded-hoja-chica border border-heliconia bg-heliconia-bg p-4 text-tinta"
      >
        <h2 id="{uid}-resumen" class="flex items-center gap-2 text-destacado text-heliconia">
          <Icono trazo={ICONOS.alerta} clase="size-5" />
          {errorServidor && pendientes.length === 0 ? 'No pudimos guardar el plan' : 'Revisa estos puntos para poder guardar'}
        </h2>
        {#if errorServidor}
          <p class="mt-2">{errorServidor}</p>
          <p class="mt-1 text-detalle text-tinta-2">Lo que escribiste sigue aquí; puedes intentarlo de nuevo.</p>
        {/if}
        {#if pendientes.length > 0}
          <ul class="mt-2 grid gap-1">
            {#each pendientes as p (p.campo)}
              <li>
                <button type="button" class="py-1 text-left font-semibold underline underline-offset-4" onclick={() => irAlCampo(p.campo)}>
                  {p.mensaje}
                </button>
              </li>
            {/each}
          </ul>
        {/if}
      </div>
    {/if}

    <form id="form-plan" bind:this={formEl} class="mt-5 space-y-4" onsubmit={guardar}>
      <SeccionEsencial bind:d bind:duracionCantidad bind:duracionUnidad errorPrecio={errorDePrecio} />
      <SeccionDescripcion bind:d />
      <SeccionIncluye bind:d />
      <SeccionItinerario bind:d />
      <SeccionEncuentro bind:d errores={erroresPolitica} {intentado} {textoVistaPrevia} />
    </form>
  </Pagina>
{/if}
