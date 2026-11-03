<script lang="ts">
  import EsqueletoPagina from '$lib/shared/ui/EsqueletoPagina.svelte';
  import Pagina from '$lib/shared/ui/Pagina.svelte';
  import PageHeader from '$lib/shared/ui/PageHeader.svelte';
  import Tarjeta from '$lib/shared/ui/Tarjeta.svelte';
  import Metrica from '$lib/shared/ui/Metrica.svelte';
  import StatusPill from '$lib/shared/ui/StatusPill.svelte';
  import Empty from '$lib/shared/ui/Empty.svelte';
  import AvisoPrueba from '../components/AvisoPrueba.svelte';
  import { miAgencia } from '$lib/features/agencias/api/agencias.api';
  import { misLiquidaciones, cuentasResumen, serviciosPrestados } from '../api/liquidaciones.api';
  import { mensajeError } from '$lib/shared/api/errores';
  import { cop } from '$lib/shared/lib/format';
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
        Cada lunes se liquida lo que prestaste la semana anterior (lunes a domingo): ventas menos la
        comisión de Diverso ({agencia!.comision_pct}%) y menos los anticipos ya entregados. Concilia estos
        montos con tus <a class="enlace" href="#/ventas">Ventas</a>.
      {/snippet}
    </PageHeader>

    <div class="mt-4"><AvisoPrueba>Las liquidaciones se registran como pagos de prueba: nada se transfiere a tu banco.</AvisoPrueba></div>

    <dl class="mt-5 grid gap-3 sm:grid-cols-2">
      <Metrica etiqueta="Pendiente de dispersar" valor={cop(resumen.pendiente)} tono="alerta" />
      <Metrica etiqueta="Dispersado (prueba)" valor={cop(resumen.pagadoPrueba)} tono="ok" />
    </dl>

    <div class="mt-4 space-y-1.5 text-[12.5px] text-suave">
      <p>
        {#if cuenta}
          Cuenta para dispersiones: <strong class="text-slate-900 dark:text-slate-100">{textoCuenta(cuenta)}</strong>
          · <a class="enlace" href="#/cuenta-dispersiones">Cambiar</a>
        {:else}
          <span class="font-semibold text-alert-ink">Aún no registras tu cuenta para dispersiones</span>
          — sin ella no se puede ejecutar ninguna liquidación.
          <a class="enlace" href="#/cuenta-dispersiones">Registrarla</a>
        {/if}
      </p>
      {#if anticipo}<p>{anticipo}</p>{/if}
    </div>

    <Tarjeta sinRelleno clase="mt-5 overflow-hidden">
      {#if liquidaciones.length === 0}
        <Empty
          icono="recibo"
          titulo="Aún no hay liquidaciones"
          mensaje="La primera aparece el lunes siguiente a la semana en que prestes un servicio pagado."
        />
      {:else}
        <div class="overflow-x-auto">
          <table class="tabla min-w-[980px]">
            <thead>
              <tr>
                <th>PERIODO</th>
                <th>TIPO</th>
                <th class="num">BRUTO</th>
                <th class="num">COMISIÓN</th>
                <th class="num">NETO</th>
                <th class="num">ANTICIPOS DESCONTADOS</th>
                <th class="num">A PAGAR</th>
                <th>ESTADO</th>
              </tr>
            </thead>
            <tbody>
              {#each liquidaciones as l (l.id)}
                <tr>
                  <td class="font-semibold whitespace-nowrap">
                    <a class="enlace" href={'#/liquidaciones/' + l.id}>
                      {periodoTexto(l.periodo_inicio, l.periodo_fin)}
                    </a>
                  </td>
                  <td>{etiquetaTipoLiquidacion(l.tipo)}</td>
                  <td class="num">{cop(l.monto_bruto)}</td>
                  <td class="num text-alert-ink">- {cop(l.comision)}</td>
                  <td class="num">{cop(l.monto_neto)}</td>
                  <td class="num">{cop(l.anticipos_descontados)}</td>
                  <td class="num font-extrabold">{cop(l.monto_a_pagar)}</td>
                  <td>
                    <StatusPill estado={l.estado} />
                    {#if l.estado === 'pendiente' && !puedeEjecutarse(l)}
                      <div class="mt-0.5 text-[11px] text-suave">Se descontará de la próxima semanal</div>
                    {/if}
                    {#if l.referencia_prueba}
                      <div class="mt-0.5 text-[11px] text-suave">{l.referencia_prueba}</div>
                    {/if}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </Tarjeta>
  </Pagina>
{/if}
