<script lang="ts">
  import Skeleton from '$lib/shared/ui/Skeleton.svelte';
  import Pagina from '$lib/shared/ui/Pagina.svelte';
  import PageHeader from '$lib/shared/ui/PageHeader.svelte';
  import Empty from '$lib/shared/ui/Empty.svelte';
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
  import ConfirmarDispersion from '../components/ConfirmarDispersion.svelte';
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
  const conteos = $derived<Record<FiltroLiquidaciones, number>>({
    pendientes: filtrarLiquidaciones(liquidaciones, 'pendientes').length,
    pagadas: filtrarLiquidaciones(liquidaciones, 'pagadas').length,
    todas: liquidaciones.length,
  });
  const porConfirmar = $derived(liquidaciones.find((l) => l.id === confirmando));
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

<AdminCabecera activa="dispersiones" />

<main id="principal" tabindex="-1" class="outline-none">
  <Pagina>
    <PageHeader titulo="Dispersiones de prueba">
      {#snippet contexto()}
        Las liquidaciones de la semana se generan solas los lunes por la mañana y los anticipos, cada hora. Aquí puedes
        generarlos a mano, registrar la dispersión de prueba y bloquear el anticipo de una agencia.
      {/snippet}
    </PageHeader>

    <GeneradorLiquidaciones
      bind:semana
      {generando}
      ongenerarsemana={generarSemana}
      onanticipos={anticiposAhora}
    />

    <FiltrosLiquidaciones {filtro} {conteos} onelegir={(valor) => (filtro = valor)} />

    {#if cargando}
      <div class="mt-4 space-y-3" role="status" aria-label="Cargando">
        {#each Array(3) as _}<Skeleton clase="h-28 rounded-hoja-chica" />{/each}
      </div>
    {:else if error}
      <Empty icono="sinConexion" titulo="No pudimos cargar las liquidaciones" mensaje={error}>
        {#snippet accion()}<button class="btn btn-secundario" onclick={cargar}>Reintentar</button>{/snippet}
      </Empty>
    {:else if visibles.length === 0}
      <Empty icono="recibo" titulo="Nada por aquí" mensaje="No hay liquidaciones en esta categoría. Genera la semana o los anticipos." />
    {:else}
      <ul class="mt-4 grid items-start gap-5 ancho:grid-cols-2">
        {#each visibles as l (l.id)}
          <TarjetaLiquidacion
            liquidacion={l}
            cuenta={cuentaDe(l.agency_id)}
            abierta={abierta === l.id}
            {items}
            onejecutar={() => confirmar(l)}
            onitems={() => alternarItems(l)}
          />
        {/each}
      </ul>
    {/if}

    {#if !cargando && !error}
      <AnticiposAgencias agencias={verificadas} {cuentaDe} onalternar={alternarBloqueo} />
    {/if}
  </Pagina>
</main>

{#if porConfirmar}
  <ConfirmarDispersion
    liquidacion={porConfirmar}
    cuenta={cuentaDe(porConfirmar.agency_id)}
    {ejecutando}
    error={errorAccion}
    oncancelar={() => (confirmando = null)}
    onconfirmar={() => ejecutar(porConfirmar)}
  />
{/if}
