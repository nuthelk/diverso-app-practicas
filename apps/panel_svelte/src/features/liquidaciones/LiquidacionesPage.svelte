<script lang="ts">
  import Skeleton from '@/shared/ui/Skeleton.svelte';
  import StatusPill from '@/shared/ui/StatusPill.svelte';
  import Empty from '@/shared/ui/Empty.svelte';
  import AvisoPrueba from './components/AvisoPrueba.svelte';
  import { miAgencia } from '@/features/agencias/agencias.api';
import { misLiquidaciones, cuentasResumen, serviciosPrestados } from './liquidaciones.api';
import { mensajeError } from '@/shared/api/errores';
  import { cop } from '@/shared/lib/format';
  import {
    etiquetaTipoLiquidacion,
    periodoTexto,
    puedeEjecutarse,
    resumenLiquidaciones,
    textoCuenta,
    type CuentaResumen,
    type Liquidacion,
  } from './liquidaciones';
  import type { Agency } from '@/features/agencias/agencia';

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
  <div class="space-y-3 p-7">
    {#each Array(5) as _}<Skeleton clase="h-14 rounded-xl" />{/each}
  </div>
{:else if error}
  <Empty icono="📡" titulo="Sin conexión" mensaje={error} />
{:else if !agencia}
  <Empty
    icono="🏢"
    titulo="Aún no tienes agencia"
    mensaje="Registra tu agencia para ver tus liquidaciones."
  />
{:else}
  <div class="aparecer mx-auto max-w-[1200px] px-4 py-6 sm:px-7">
    <h1 class="text-[24px] font-extrabold tracking-tight">Liquidaciones</h1>
    <p class="mt-1 max-w-[760px] text-[13px] text-slate-500 dark:text-slate-400">
      Cada lunes se liquida lo que prestaste la semana anterior (lunes a domingo): ventas menos la
      comisión de Diverso ({agencia.comision_pct}%) y menos los anticipos ya entregados. Concilia estos
      montos con tus <a class="font-semibold text-brand-600 hover:underline dark:text-brand-300" href="#/ventas">Ventas</a>.
    </p>

    <div class="mt-4"><AvisoPrueba>Las liquidaciones se registran como pagos de prueba: nada se transfiere a tu banco.</AvisoPrueba></div>

    <!-- Resumen -->
    <div class="mt-5 flex flex-wrap gap-3">
      <div class="rounded-2xl border border-slate-200/80 bg-white px-5 py-3 dark:border-ink-600 dark:bg-ink-800">
        <div class="text-[12px] text-slate-500 dark:text-slate-400">Pendiente de dispersar</div>
        <div class="mt-0.5 text-[17px] font-extrabold text-orange-600 tabular-nums">{cop(resumen.pendiente)}</div>
      </div>
      <div class="rounded-2xl border border-slate-200/80 bg-white px-5 py-3 dark:border-ink-600 dark:bg-ink-800">
        <div class="text-[12px] text-slate-500 dark:text-slate-400">Dispersado (prueba)</div>
        <div class="mt-0.5 text-[17px] font-extrabold text-ok-600 tabular-nums">{cop(resumen.pagadoPrueba)}</div>
      </div>
    </div>

    <div class="mt-4 space-y-1.5 text-[12.5px] text-slate-600 dark:text-slate-300">
      <p>
        {#if cuenta}
          Cuenta para dispersiones: <strong>{textoCuenta(cuenta)}</strong>
          · <a class="font-semibold text-brand-600 hover:underline dark:text-brand-300" href="#/cuenta-dispersiones">Cambiar</a>
        {:else}
          <span class="font-semibold text-orange-700 dark:text-orange-300">Aún no registras tu cuenta para dispersiones</span>
          — sin ella no se puede ejecutar ninguna liquidación.
          <a class="font-semibold text-brand-600 hover:underline dark:text-brand-300" href="#/cuenta-dispersiones">Registrarla</a>
        {/if}
      </p>
      {#if anticipo}<p>{anticipo}</p>{/if}
    </div>

    <!-- Tabla -->
    <div class="mt-6 overflow-hidden rounded-2xl border border-slate-200/80 bg-white dark:border-ink-600 dark:bg-ink-800">
      {#if liquidaciones.length === 0}
        <Empty
          icono="🧾"
          titulo="Aún no hay liquidaciones"
          mensaje="La primera aparece el lunes siguiente a la semana en que prestes un servicio pagado."
        />
      {:else}
        <div class="overflow-x-auto">
          <table class="w-full min-w-[980px] text-[13px]">
            <thead>
              <tr class="bg-slate-500/8 text-left text-[11px] tracking-[0.08em] text-slate-500 dark:text-slate-400">
                <th class="px-4 py-2.5 font-bold">PERIODO</th>
                <th class="px-4 py-2.5 font-bold">TIPO</th>
                <th class="px-4 py-2.5 text-right font-bold">BRUTO</th>
                <th class="px-4 py-2.5 text-right font-bold">COMISIÓN</th>
                <th class="px-4 py-2.5 text-right font-bold">NETO</th>
                <th class="px-4 py-2.5 text-right font-bold">ANTICIPOS DESCONTADOS</th>
                <th class="px-4 py-2.5 text-right font-bold">A PAGAR</th>
                <th class="px-4 py-2.5 font-bold">ESTADO</th>
              </tr>
            </thead>
            <tbody>
              {#each liquidaciones as l (l.id)}
                <tr class="border-t border-slate-200/70 transition hover:bg-slate-500/5 dark:border-ink-600">
                  <td class="px-4 py-3 font-semibold whitespace-nowrap">
                    <a class="text-brand-700 hover:underline dark:text-brand-200" href={'#/liquidaciones/' + l.id}>
                      {periodoTexto(l.periodo_inicio, l.periodo_fin)}
                    </a>
                  </td>
                  <td class="px-4 py-3">{etiquetaTipoLiquidacion(l.tipo)}</td>
                  <td class="px-4 py-3 text-right tabular-nums">{cop(l.monto_bruto)}</td>
                  <td class="px-4 py-3 text-right text-orange-600 tabular-nums">- {cop(l.comision)}</td>
                  <td class="px-4 py-3 text-right tabular-nums">{cop(l.monto_neto)}</td>
                  <td class="px-4 py-3 text-right tabular-nums">{cop(l.anticipos_descontados)}</td>
                  <td class="px-4 py-3 text-right font-extrabold tabular-nums">{cop(l.monto_a_pagar)}</td>
                  <td class="px-4 py-3">
                    <StatusPill estado={l.estado} />
                    {#if l.estado === 'pendiente' && !puedeEjecutarse(l)}
                      <div class="mt-0.5 text-[11px] text-slate-400">Se descontará de la próxima semanal</div>
                    {/if}
                    {#if l.referencia_prueba}
                      <div class="mt-0.5 text-[11px] text-slate-400">{l.referencia_prueba}</div>
                    {/if}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>
  </div>
{/if}
