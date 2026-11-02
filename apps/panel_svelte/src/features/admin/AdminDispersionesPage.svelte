<script lang="ts">
  import Skeleton from '@/shared/ui/Skeleton.svelte';
  import Empty from '@/shared/ui/Empty.svelte';
  import AvisoPrueba from '@/features/liquidaciones/components/AvisoPrueba.svelte';
  import { cuentasResumen, liquidacionDetalle } from '@/features/liquidaciones/liquidaciones.api';
  import { mensajeError } from '@/shared/api/errores';
  import { avisar } from '@/shared/lib/toast.svelte';
  import {
    filtrarLiquidaciones,
    semanaAnterior,
    type CuentaResumen,
    type FiltroLiquidaciones,
    type Liquidacion,
    type LiquidacionItem,
  } from '@/features/liquidaciones/liquidaciones';
  import type { Agency } from '@/features/agencias/agencia';
  import {
    todasLasAgencias,
    todasLiquidaciones,
    generarLiquidaciones,
    generarAnticipos,
    ejecutarLiquidacion,
    bloquearAnticipo,
  } from './admin.api';
  import { avisoAnticiposGenerados, avisoSemanaGenerada } from './admin';
  import AdminCabecera from './components/AdminCabecera.svelte';
  import AnticiposAgencias from './components/AnticiposAgencias.svelte';
  import FiltrosLiquidaciones from './components/FiltrosLiquidaciones.svelte';
  import GeneradorLiquidaciones from './components/GeneradorLiquidaciones.svelte';
  import TarjetaLiquidacion from './components/TarjetaLiquidacion.svelte';

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

  <div class="mx-auto max-w-[1100px] px-5 py-7 sm:px-7">
    <h1 class="text-[26px] font-extrabold tracking-tight">Dispersiones de prueba</h1>
    <p class="mt-1 max-w-[720px] text-[13.5px] leading-relaxed text-slate-500 dark:text-slate-400">
      Cada lunes a las 06:00 (Bogotá) se liquida la semana anterior y cada hora se calculan los
      anticipos. Aquí puedes generarlos a mano, ejecutar la dispersión de prueba y bloquear el
      anticipo de una agencia.
    </p>
    <div class="mt-4"><AvisoPrueba>Ejecutar solo marca la liquidación como pagada de prueba; no se transfiere nada.</AvisoPrueba></div>

    <GeneradorLiquidaciones
      bind:semana
      {generando}
      ongenerarsemana={generarSemana}
      onanticipos={anticiposAhora}
    />

    <FiltrosLiquidaciones {filtro} onelegir={(valor) => (filtro = valor)} />

    {#if cargando}
      <div class="mt-4 space-y-3">{#each Array(3) as _}<Skeleton clase="h-[110px]" />{/each}</div>
    {:else if error}
      <Empty icono="📡" titulo="No pudimos cargar las liquidaciones" mensaje={error} />
    {:else if visibles.length === 0}
      <Empty icono="🧾" titulo="Nada por aquí" mensaje="No hay liquidaciones en esta categoría. Genera la semana o los anticipos." />
    {:else}
      <ul class="mt-4 space-y-3">
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
  </div>
</div>
