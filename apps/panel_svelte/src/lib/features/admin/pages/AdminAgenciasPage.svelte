<script lang="ts">
  import Skeleton from '$lib/shared/ui/Skeleton.svelte';
  import Pagina from '$lib/shared/ui/Pagina.svelte';
  import PageHeader from '$lib/shared/ui/PageHeader.svelte';
  import Empty from '$lib/shared/ui/Empty.svelte';
  import { mensajeError } from '$lib/shared/api/errores';
  import { avisar } from '$lib/shared/lib/toast.svelte';
  import { fechaTexto } from '$lib/shared/lib/format';
  import { vigenciaSugerida, type Agency, type VerificationLog } from '$lib/features/agencias/model/agencia';
  import {
    conteosAgencias,
    filtrarAgencias,
    type FiltroAgencias,
  } from '$lib/features/agencias/model/verificacion';
  import {
    todasLasAgencias,
    verificarAgencia,
    rechazarAgencia,
    actualizarVigencia,
    historialVerificacion,
  } from '../api/admin.api';
  import { vigenciaInicial, type TipoAccion } from '../model/admin';
  import AdminCabecera from '../components/AdminCabecera.svelte';
  import FiltrosAgencias from '../components/FiltrosAgencias.svelte';
  import TarjetaAgencia from '../components/TarjetaAgencia.svelte';

  type Accion = { tipo: TipoAccion; agencia: Agency };

  let cargando = $state(true);
  let error = $state('');
  let agencias = $state<Agency[]>([]);
  let filtro = $state<FiltroAgencias>('pendientes');
  let busqueda = $state('');
  let filtroElegido = false;

  let accion = $state<Accion | null>(null);
  let fechaVigencia = $state(vigenciaSugerida());
  let motivo = $state('');
  let confirmado = $state(false);
  let procesando = $state(false);
  let errorAccion = $state('');

  let historialAbierto = $state<string | null>(null);
  let historial = $state<VerificationLog[]>([]);

  async function cargar() {
    cargando = true;
    error = '';
    try {
      agencias = await todasLasAgencias();
      if (!filtroElegido) {
        // Abre en la cola más útil: pendientes, luego RNT por renovar.
        filtro = conteos.pendientes > 0 ? 'pendientes' : conteos.atencion > 0 ? 'atencion' : 'todas';
      }
    } catch (e) {
      error = mensajeError(e);
    } finally {
      cargando = false;
    }
  }
  cargar();

  const conteos = $derived(conteosAgencias(agencias));
  const visibles = $derived(filtrarAgencias(agencias, filtro, busqueda));

  function elegirFiltro(valor: FiltroAgencias) {
    filtro = valor;
    filtroElegido = true;
  }

  function abrir(tipo: TipoAccion, a: Agency) {
    accion = { tipo, agencia: a };
    fechaVigencia = vigenciaInicial(a, tipo);
    motivo = '';
    confirmado = false;
    errorAccion = '';
  }

  async function ejecutar(e: SubmitEvent) {
    e.preventDefault();
    if (!accion) return;
    procesando = true;
    errorAccion = '';
    const { tipo, agencia } = accion;
    try {
      if (tipo === 'verificar') {
        await verificarAgencia(agencia.id, fechaVigencia);
        avisar(`${agencia.nombre} verificada hasta el ${fechaTexto(fechaVigencia)}.`);
      } else if (tipo === 'vigencia') {
        await actualizarVigencia(agencia.id, fechaVigencia);
        avisar(`Vigencia del RNT de ${agencia.nombre} actualizada.`);
      } else {
        await rechazarAgencia(agencia.id, motivo.trim());
        avisar(`${agencia.nombre} quedó rechazada. Verá el motivo en su panel.`);
      }
      accion = null;
      await cargar();
      if (historialAbierto === agencia.id) historial = await historialVerificacion(agencia.id);
    } catch (e) {
      errorAccion = mensajeError(e);
    } finally {
      procesando = false;
    }
  }

  async function alternarHistorial(a: Agency) {
    if (historialAbierto === a.id) {
      historialAbierto = null;
      return;
    }
    historialAbierto = a.id;
    historial = [];
    try {
      historial = await historialVerificacion(a.id);
    } catch (e) {
      avisar(mensajeError(e));
    }
  }
</script>

<div class="min-h-screen">
  <AdminCabecera href="#/admin/dispersiones" texto="Dispersiones de prueba" />

  <Pagina>
    <PageHeader titulo="Verificación de agencias">
      {#snippet contexto()}
        <span class="block max-w-[680px]">
          Contrasta el RNT en el registro oficial y la matrícula en la Cámara de Comercio antes de
          aprobar. Una agencia solo vende mientras su RNT esté vigente; si cambia su RNT o su matrícula
          vuelve automáticamente a esta cola.
        </span>
      {/snippet}
    </PageHeader>

    <FiltrosAgencias {filtro} {conteos} bind:busqueda onelegir={elegirFiltro} />

    {#if cargando}
      <div class="mt-6 space-y-3" role="status" aria-label="Cargando">
        {#each Array(4) as _}<Skeleton clase="h-[140px]" />{/each}
      </div>
    {:else if error}
      <Empty icono="sinConexion" titulo="No pudimos cargar las agencias" mensaje={error} />
    {:else if visibles.length === 0}
      <Empty
        icono="check"
        titulo="Nada pendiente aquí"
        mensaje={filtro === 'pendientes'
          ? 'No hay agencias esperando verificación.'
          : 'No hay agencias en esta categoría.'}
      />
    {:else}
      <ul class="mt-6 grid items-start gap-5 min-[1500px]:grid-cols-2">
        {#each visibles as a (a.id)}
          <TarjetaAgencia
            agencia={a}
            accion={accion?.agencia.id === a.id ? accion.tipo : null}
            historialAbierto={historialAbierto === a.id}
            {historial}
            bind:fechaVigencia
            bind:motivo
            bind:confirmado
            {procesando}
            {errorAccion}
            onabrir={(tipo) => abrir(tipo, a)}
            oncancelar={() => (accion = null)}
            onejecutar={ejecutar}
            onhistorial={() => alternarHistorial(a)}
          />
        {/each}
      </ul>
    {/if}
  </Pagina>
</div>
