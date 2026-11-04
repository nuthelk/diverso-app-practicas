<script lang="ts">
  import Skeleton from '$lib/shared/ui/Skeleton.svelte';
  import Pagina from '$lib/shared/ui/Pagina.svelte';
  import PageHeader from '$lib/shared/ui/PageHeader.svelte';
  import Empty from '$lib/shared/ui/Empty.svelte';
  import AvisoPrueba from '$lib/features/liquidaciones/components/AvisoPrueba.svelte';
  import { cuentasResumen, liquidacionDetalle } from '$lib/features/liquidaciones/api/liquidaciones.api';
  import { mensajeError } from '$lib/shared/api/errores';
  import { avisar } from '$lib/shared/lib/toast.svelte';
  import {
    filtrarLiquidaciones,
    semanaAnterior,
    type CuentaResumen,
    type FiltroLiquidaciones,
    type Liquidacion,
    type LiquidacionItem,
  } from '$lib/features/liquidaciones/model/liquidaciones';
  import type { Agency } from '$lib/features/agencias/model/agencia';
  import {
    todasLasAgencias,
    todasLiquidaciones,
    generarLiquidaciones,
    generarAnticipos,
    ejecutarLiquidacion,
    bloquearAnticipo,
  } from '../api/admin.api';
  import { avisoAnticiposGenerados, avisoSemanaGenerada } from '../model/admin';
  import AdminCabecera from '../components/AdminCabecera.svelte';
  import AnticiposAgencias from '../components/AnticiposAgencias.svelte';
  import FiltrosLiquidaciones from '../components/FiltrosLiquidaciones.svelte';
  import GeneradorLiquidaciones from '../components/GeneradorLiquidaciones.svelte';
  import TarjetaLiquidacion from '../components/TarjetaLiquidacion.svelte';

  let cargando = $state(true);
  let error = $state('');
  let liquidaciones = $state<Liquidacion[]>([]);
  let agencias = $state<Agency[]>([]);
  let cuentas = $state<CuentaResumen[]>([]);
  let filtro = $state<FiltroLiquidaciones>('pendientes');

  let semana = $state(semanaAnterior());
  let generando = $state(false);

  let confirmando = $state<string | null>(null);
  let ejecutando = $state(false);
  let errorAccion = $state('');

  let abierta = $state<string | null>(null);
  let items = $state<LiquidacionItem[]>([]);

  async function cargar() {
    cargando = true;
    error = '';
    try {
      [liquidaciones, agencias, cuentas] = await Promise.all([
        todasLiquidaciones(),
        todasLasAgencias(),
        cuentasResumen(),
      ]);
    } catch (e) {
      error = mensajeError(e);
    } finally {
      cargando = false;
    }
  }
  cargar();

  const visibles = $derived(filtrarLiquidaciones(liquidaciones, filtro));
  const cuentaDe = (agencyId: string) => cuentas.find((c) => c.agency_id === agencyId);
  const verificadas = $derived(agencias.filter((a) => a.estado_verificacion === 'verificado'));

  async function generarSemana() {
    generando = true;
    try {
      avisar(avisoSemanaGenerada(await generarLiquidaciones(semana)));
      await cargar();
    } catch (e) {
      avisar(mensajeError(e));
    } finally {
      generando = false;
    }
  }

  async function anticiposAhora() {
    generando = true;
    try {
      avisar(avisoAnticiposGenerados(await generarAnticipos()));
      await cargar();
    } catch (e) {
      avisar(mensajeError(e));
    } finally {
      generando = false;
    }
  }

  async function ejecutar(l: Liquidacion) {
    ejecutando = true;
    errorAccion = '';
    try {
      const r = await ejecutarLiquidacion(l.id);
      avisar(`Dispersión de prueba registrada: ${r.referencia_prueba}`);
      confirmando = null;
      await cargar();
    } catch (e) {
      errorAccion = mensajeError(e);
    } finally {
      ejecutando = false;
    }
  }

  function confirmar(l: Liquidacion) {
    confirmando = l.id;
    errorAccion = '';
  }

  async function alternarItems(l: Liquidacion) {
    if (abierta === l.id) {
      abierta = null;
      return;
    }
    abierta = l.id;
    items = [];
    try {
      items = (await liquidacionDetalle(l.id))?.liquidacion_items ?? [];
    } catch (e) {
      avisar(mensajeError(e));
    }
  }

  async function alternarBloqueo(a: Agency) {
    const bloquear = !a.anticipo_bloqueado;
    try {
      await bloquearAnticipo(a.id, bloquear);
      avisar(bloquear ? `Anticipos de ${a.nombre} bloqueados.` : `Anticipos de ${a.nombre} habilitados.`);
      agencias = agencias.map((x) => (x.id === a.id ? { ...x, anticipo_bloqueado: bloquear } : x));
    } catch (e) {
      avisar(mensajeError(e));
    }
  }
</script>

<div class="min-h-screen">
  <AdminCabecera href="#/admin" texto="Verificación de agencias" />

  <Pagina>
    <PageHeader titulo="Dispersiones de prueba">
      {#snippet contexto()}
        <span class="block max-w-[720px]">
          Cada lunes a las 06:00 (Bogotá) se liquida la semana anterior y cada hora se calculan los
          anticipos. Aquí puedes generarlos a mano, ejecutar la dispersión de prueba y bloquear el
          anticipo de una agencia.
        </span>
      {/snippet}
    </PageHeader>
    <div class="mt-4"><AvisoPrueba>Ejecutar solo marca la liquidación como pagada de prueba; no se transfiere nada.</AvisoPrueba></div>

    <GeneradorLiquidaciones
      bind:semana
      {generando}
      ongenerarsemana={generarSemana}
      onanticipos={anticiposAhora}
    />

    <FiltrosLiquidaciones {filtro} onelegir={(valor) => (filtro = valor)} />

    {#if cargando}
      <div class="mt-4 space-y-3" role="status" aria-label="Cargando">{#each Array(3) as _}<Skeleton clase="h-[110px]" />{/each}</div>
    {:else if error}
      <Empty icono="sinConexion" titulo="No pudimos cargar las liquidaciones" mensaje={error} />
    {:else if visibles.length === 0}
      <Empty icono="recibo" titulo="Nada por aquí" mensaje="No hay liquidaciones en esta categoría. Genera la semana o los anticipos." />
    {:else}
      <ul class="mt-4 grid items-start gap-5 min-[1500px]:grid-cols-2">
        {#each visibles as l (l.id)}
          <TarjetaLiquidacion
            liquidacion={l}
            cuenta={cuentaDe(l.agency_id)}
            confirmando={confirmando === l.id}
            {ejecutando}
            {errorAccion}
            abierta={abierta === l.id}
            {items}
            onconfirmar={() => confirmar(l)}
            oncancelar={() => (confirmando = null)}
            onejecutar={() => ejecutar(l)}
            onitems={() => alternarItems(l)}
          />
        {/each}
      </ul>
    {/if}

    <AnticiposAgencias
      agencias={cargando ? [] : verificadas}
      {cuentaDe}
      onalternar={alternarBloqueo}
    />
  </Pagina>
</div>
