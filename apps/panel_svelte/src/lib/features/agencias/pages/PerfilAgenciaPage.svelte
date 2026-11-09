<script lang="ts">
  import Pagina from '$lib/shared/ui/Pagina.svelte';
  import PageHeader from '$lib/shared/ui/PageHeader.svelte';
  import EsqueletoPagina from '$lib/shared/ui/EsqueletoPagina.svelte';
  import Tarjeta from '$lib/shared/ui/Tarjeta.svelte';
  import Empty from '$lib/shared/ui/Empty.svelte';
  import AlertaError from '$lib/shared/ui/AlertaError.svelte';
  import StatusPill from '$lib/shared/ui/StatusPill.svelte';
  import { mensajeError } from '$lib/shared/api/errores';
  import { miAgencia } from '../api/agencias.api';
  import type { Agency } from '../model/agencia';
  import { textoVigencia } from '../model/verificacion';
  import LogoAgencia from '../components/LogoAgencia.svelte';
  import { avisarCambioAgencia } from '../model/cambios-agencia.svelte';

  /**
   * El perfil de la agencia: su logo (cambiar o quitar) y los datos con los que se registró, solo para consultar.
   * Se abre desde el menú de cuenta del marco.
   */
  let cargando = $state(true);
  let error = $state('');
  let agencia = $state<Agency | null>(null);

  async function cargar() {
    cargando = true;
    error = '';
    try {
      agencia = await miAgencia();
    } catch (e) {
      error = mensajeError(e);
    } finally {
      cargando = false;
    }
  }

  function logoActualizado(logoUrl: string | null) {
    if (agencia) agencia = { ...agencia, logo_url: logoUrl };
    avisarCambioAgencia();
  }

  // Carga al montar (initState): llamada directa, sin $effect.
  cargar();

  const vigencia = $derived(agencia ? textoVigencia(agencia) : null);
  /** Lo que la agencia no llenó (teléfono, correo y WhatsApp pueden ser null) se dice, no se deja en blanco. */
  const registrado = (valor: string | null) => (valor ?? '').trim() || 'No registrado';
</script>

{#if cargando}
  <EsqueletoPagina ancho={820} filas={2} clase="h-40" />
{:else}
  <Pagina ancho={820}>
    <PageHeader titulo="Perfil de la agencia">
      {#snippet contexto()}Tu logo y los datos con los que registraste la agencia.{/snippet}
    </PageHeader>

    {#if error}
      <div class="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
        <AlertaError>{error}</AlertaError>
        <button type="button" class="btn btn-secundario btn-chico" onclick={cargar}>Reintentar</button>
      </div>
    {:else if !agencia}
      <div class="mt-6 tarjeta">
        <Empty icono="edificio" titulo="Aún no tienes agencia" mensaje="Registra tu agencia para tener un perfil.">
          {#snippet accion()}<a class="btn btn-primario" href="#/onboarding">Registrar mi agencia</a>{/snippet}
        </Empty>
      </div>
    {:else}
      <div class="mt-6 grid gap-6">
        <LogoAgencia {agencia} onactualizado={logoActualizado} />

        <Tarjeta titulo="Datos de la agencia" descripcion="Así quedó registrada tu agencia. Aquí solo se pueden consultar.">
          <dl class="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <div class="sm:col-span-2">
              <dt class="text-detalle text-tinta-2">Nombre</dt>
              <dd class="text-destacado font-semibold [overflow-wrap:anywhere]">{agencia.nombre}</dd>
            </div>
            <div>
              <dt class="text-detalle text-tinta-2">Verificación</dt>
              <dd class="mt-0.5"><StatusPill estado={agencia.estado_verificacion} /></dd>
            </div>
            <div>
              <dt class="text-detalle text-tinta-2">Ciudad</dt>
              <dd>{agencia.ciudad}</dd>
            </div>
            <div>
              <dt class="text-detalle text-tinta-2">Número de RNT</dt>
              <dd class="font-semibold tabular-nums">{agencia.numero_rnt}</dd>
            </div>
            <div>
              <dt class="text-detalle text-tinta-2">Vigencia del RNT</dt>
              <dd class="font-semibold {vigencia?.clase}">{vigencia?.texto}</dd>
            </div>
            <div>
              <dt class="text-detalle text-tinta-2">Matrícula mercantil</dt>
              <dd class="font-semibold tabular-nums">{agencia.matricula_camara_comercio}</dd>
            </div>
            <div>
              <dt class="text-detalle text-tinta-2">Correo de contacto</dt>
              <dd class="[overflow-wrap:anywhere]">{registrado(agencia.email)}</dd>
            </div>
            <div>
              <dt class="text-detalle text-tinta-2">Teléfono</dt>
              <dd>{registrado(agencia.telefono)}</dd>
            </div>
            <div>
              <dt class="text-detalle text-tinta-2">WhatsApp</dt>
              <dd>{registrado(agencia.whatsapp)}</dd>
            </div>
            <div class="sm:col-span-2">
              <dt class="text-detalle text-tinta-2">Descripción</dt>
              <dd class="max-w-[68ch] whitespace-pre-line [overflow-wrap:anywhere]">{registrado(agencia.descripcion)}</dd>
            </div>
          </dl>
        </Tarjeta>
      </div>
    {/if}
  </Pagina>
{/if}
