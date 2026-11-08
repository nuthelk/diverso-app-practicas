<script lang="ts">
  import EsqueletoPagina from '$lib/shared/ui/EsqueletoPagina.svelte';
  import Pagina from '$lib/shared/ui/Pagina.svelte';
  import PageHeader from '$lib/shared/ui/PageHeader.svelte';
  import Tarjeta from '$lib/shared/ui/Tarjeta.svelte';
  import FranjaMetricas from '$lib/shared/ui/FranjaMetricas.svelte';
  import Metrica from '$lib/shared/ui/Metrica.svelte';
  import TablaDatos, { type Columna } from '$lib/shared/ui/TablaDatos.svelte';
  import StatusPill from '$lib/shared/ui/StatusPill.svelte';
  import Empty from '$lib/shared/ui/Empty.svelte';
  import { miAgencia } from '$lib/features/agencias/api/agencias.api';
  import { misLiquidaciones, cuentasResumen, serviciosPrestados } from '../api/liquidaciones.api';
  import { mensajeError } from '$lib/shared/api/errores';
  import { cop, plural } from '$lib/shared/lib/format';
  import {
    etiquetaTipoLiquidacion,
    periodoTexto,
    puedeEjecutarse,
    resumenLiquidaciones,
    textoCuenta,
    type CuentaResumen,
    type Liquidacion,
  } from '../model/liquidaciones';
  import type { Agency } from '$lib/features/agencias/model/agencia';

  /** Servicios prestados desde los que la agencia recibe anticipo (Anexo 8 §3.2). */
  const MIN_SERVICIOS_ANTICIPO = 10;

  const COLUMNAS: Columna[] = [
    { clave: 'periodo', titulo: 'Periodo', principal: true },
    { clave: 'tipo', titulo: 'Tipo' },
    { clave: 'bruto', titulo: 'Bruto', num: true },
    { clave: 'comision', titulo: 'Comisión', num: true },
    { clave: 'neto', titulo: 'Neto', num: true },
    { clave: 'anticipos', titulo: 'Anticipos ya entregados', num: true },
    { clave: 'a_pagar', titulo: 'A pagar', num: true },
    { clave: 'estado', titulo: 'Estado' },
  ];

  let cargando = $state(true);
  let error = $state('');
  let agencia = $state<Agency | null>(null);
  let liquidaciones = $state<Liquidacion[]>([]);
  let cuenta = $state<CuentaResumen | null>(null);
  let servicios = $state<number | null>(null);

  async function cargar() {
    cargando = true;
    error = '';
    try {
      agencia = await miAgencia();
      if (agencia) {
        const [liqs, cuentas, prestados] = await Promise.all([
          misLiquidaciones(agencia.id),
          cuentasResumen(),
          serviciosPrestados(agencia.id).catch(() => null),
        ]);
        liquidaciones = liqs;
        cuenta = cuentas.find((c) => c.agency_id === agencia!.id) ?? null;
        servicios = prestados;
      }
    } catch (e) {
      error = mensajeError(e);
    } finally {
      cargando = false;
    }
  }

  $effect(() => {
    cargar();
  });

  const resumen = $derived(resumenLiquidaciones(liquidaciones));
  const nPendientes = $derived(liquidaciones.filter((l) => l.estado === 'pendiente').length);
  const nPagadas = $derived(liquidaciones.filter((l) => l.estado === 'pagada_prueba').length);
  const anticipo = $derived.by(() => {
    if (!agencia) return '';
    if (agencia.anticipo_bloqueado) {
      return 'Tus anticipos están bloqueados por el equipo Diverso. Escríbenos si necesitas revisarlo.';
    }
    if (servicios === null) return '';
    return servicios >= MIN_SERVICIOS_ANTICIPO
      ? `Recibes un anticipo del 30 % del neto 48 horas antes de cada salida (${servicios} servicios prestados).`
      : `El anticipo del 30 % se habilita con ${MIN_SERVICIOS_ANTICIPO} servicios prestados; llevas ${servicios}.`;
  });
</script>

{#if cargando}
  <EsqueletoPagina filas={5} clase="h-14" />
{:else if error}
  <Empty icono="sinConexion" titulo="Sin conexión" mensaje={error} />
{:else if !agencia}
  <Empty
    icono="edificio"
    titulo="Aún no tienes agencia"
    mensaje="Registra tu agencia para ver tus liquidaciones."
  />
{:else}
  <Pagina>
    <PageHeader titulo="Liquidaciones">
      {#snippet contexto()}
        Cada lunes se liquida lo que prestaste la semana anterior: lo vendido, menos la comisión de Diverso
        ({agencia!.comision_pct}%) y los anticipos que ya recibiste. Compáralo con tus
        <a class="enlace" href="#/ventas">Ventas</a>.
      {/snippet}
    </PageHeader>

    <div class="mt-6">
      <FranjaMetricas columnas={2}>
        <Metrica
          etiqueta="Pendiente de dispersar"
          valor={cop(resumen.pendiente)}
          sub="{nPendientes} {plural(nPendientes, 'liquidación', 'liquidaciones')}"
          tono="alerta"
        />
        <Metrica
          etiqueta="Dispersado (prueba)"
          valor={cop(resumen.pagadoPrueba)}
          sub="{nPagadas} {plural(nPagadas, 'liquidación', 'liquidaciones')}"
          tono="ok"
        />
      </FranjaMetricas>
    </div>

    <div class="mt-5 space-y-1.5 text-cuerpo text-tinta-2">
      <p>
        {#if cuenta}
          Cuenta para dispersiones: <strong class="text-tinta">{textoCuenta(cuenta)}</strong>
          · <a class="enlace" href="#/cuenta-dispersiones">Cambiar</a>
        {:else}
          <span class="font-bold text-prueba-ink">Aún no registras tu cuenta para dispersiones</span>
          — sin ella no se puede ejecutar ninguna liquidación.
          <a class="enlace" href="#/cuenta-dispersiones">Registrarla</a>
        {/if}
      </p>
      {#if anticipo}<p>{anticipo}</p>{/if}
    </div>

    <Tarjeta etiqueta="Liquidaciones de la agencia" sinRelleno clase="mt-6 overflow-hidden">
      {#if liquidaciones.length === 0}
        <Empty
          icono="recibo"
          titulo="Aún no hay liquidaciones"
          mensaje="La primera aparece el lunes siguiente a la semana en que prestes un servicio pagado."
        />
      {:else}
        <TablaDatos
          caption="Liquidaciones de la agencia, de la más reciente a la más antigua"
          columnas={COLUMNAS}
          filas={liquidaciones}
          clave={(l) => l.id}
        >
          {#snippet celda(l: Liquidacion, c: Columna)}
            {#if c.clave === 'periodo'}
              <a class="enlace font-semibold whitespace-nowrap" href={'#/liquidaciones/' + l.id}>
                {periodoTexto(l.periodo_inicio, l.periodo_fin)}
              </a>
            {:else if c.clave === 'tipo'}
              {etiquetaTipoLiquidacion(l.tipo)}
            {:else if c.clave === 'bruto'}
              {cop(l.monto_bruto)}
            {:else if c.clave === 'comision'}
              <span class="text-prueba-ink">- {cop(l.comision)}</span>
            {:else if c.clave === 'neto'}
              {cop(l.monto_neto)}
            {:else if c.clave === 'anticipos'}
              {cop(l.anticipos_descontados)}
            {:else if c.clave === 'a_pagar'}
              <span class="font-bold">{cop(l.monto_a_pagar)}</span>
            {:else}
              <div>
                <StatusPill estado={l.estado} />
                {#if l.estado === 'pendiente' && !puedeEjecutarse(l)}
                  <div class="mt-0.5 text-detalle text-tinta-2">Se descontará de la próxima semanal</div>
                {/if}
                {#if l.referencia_prueba}
                  <div class="mt-0.5 text-detalle text-tinta-2 break-all">{l.referencia_prueba}</div>
                {/if}
              </div>
            {/if}
          {/snippet}
        </TablaDatos>
      {/if}
    </Tarjeta>
  </Pagina>
{/if}

