<script lang="ts">
  import Logo from '@/shared/ui/Logo.svelte';
  import Skeleton from '@/shared/ui/Skeleton.svelte';
  import StatusPill from '@/shared/ui/StatusPill.svelte';
  import Empty from '@/shared/ui/Empty.svelte';
  import AvisoPrueba from '@/features/liquidaciones/components/AvisoPrueba.svelte';
  import ItemsLiquidacion from '@/features/liquidaciones/components/ItemsLiquidacion.svelte';
  import {
  todasLasAgencias,
  todasLiquidaciones,
  generarLiquidaciones,
  generarAnticipos,
  ejecutarLiquidacion,
  bloquearAnticipo,
} from './admin.api';
import { cuentasResumen, liquidacionDetalle } from '@/features/liquidaciones/liquidaciones.api';
import { mensajeError } from '@/shared/api/errores';
  import { auth, signOut } from '@/features/auth/auth.svelte';
  import { avisar } from '@/shared/lib/toast.svelte';
  import { cop, fechaTexto } from '@/shared/lib/format';
  import {
    AVISO_PRUEBA,
    etiquetaTipoLiquidacion,
    filtrarLiquidaciones,
    notaEstado,
    periodoTexto,
    puedeEjecutarse,
    rangoSemana,
    semanaAnterior,
    semanaTerminada,
    textoCuenta,
    type CuentaResumen,
    type FiltroLiquidaciones,
    type Liquidacion,
    type LiquidacionItem,
  } from '@/features/liquidaciones/liquidaciones';
  import type { Agency } from '@/features/agencias/agencia';

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

  const rango = $derived(semana ? rangoSemana(semana) : null);
  const semanaLista = $derived(!!semana && semanaTerminada(semana));
  const visibles = $derived(filtrarLiquidaciones(liquidaciones, filtro));
  const cuentaDe = (agencyId: string) => cuentas.find((c) => c.agency_id === agencyId);
  const verificadas = $derived(agencias.filter((a) => a.estado_verificacion === 'verificado'));

  const FILTROS: { valor: FiltroLiquidaciones; etiqueta: string }[] = [
    { valor: 'pendientes', etiqueta: 'Pendientes' },
    { valor: 'pagadas', etiqueta: 'Pagadas (prueba)' },
    { valor: 'todas', etiqueta: 'Todas' },
  ];

  async function generarSemana() {
    generando = true;
    try {
      const r = await generarLiquidaciones(semana);
      avisar(
        r.liquidaciones === 0
          ? `Semana del ${periodoTexto(r.periodo_inicio, r.periodo_fin)}: no había nada nuevo por liquidar.`
          : `Semana del ${periodoTexto(r.periodo_inicio, r.periodo_fin)}: ${r.liquidaciones} liquidaciones con ${r.items} items.`,
      );
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
      const r = await generarAnticipos();
      avisar(
        r.liquidaciones === 0
          ? 'No había anticipos nuevos por generar.'
          : `Anticipos generados: ${r.liquidaciones} liquidaciones con ${r.items} reservas.`,
      );
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
  <header
    class="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200/80 bg-white/90 px-5
      py-3 backdrop-blur sm:px-7 dark:border-ink-600 dark:bg-ink-900/90"
  >
    <div class="flex size-9 items-center justify-center rounded-xl bg-brand-600 text-white">
      <Logo size={20} />
    </div>
    <div class="text-[15px] font-extrabold tracking-tight">Diverso · Administración</div>
    <a class="ml-3 text-[13px] font-semibold text-brand-600 hover:underline dark:text-brand-300" href="#/admin">
      Verificación de agencias
    </a>
    <div class="flex-1"></div>
    <span class="hidden text-[12.5px] text-slate-400 sm:inline">{auth.email}</span>
    <button class="btn btn-secundario py-1.5 text-[13px]" onclick={() => signOut()}>Cerrar sesión</button>
  </header>

  <div class="mx-auto max-w-[1100px] px-5 py-7 sm:px-7">
    <h1 class="text-[26px] font-extrabold tracking-tight">Dispersiones de prueba</h1>
    <p class="mt-1 max-w-[720px] text-[13.5px] leading-relaxed text-slate-500 dark:text-slate-400">
      Cada lunes a las 06:00 (Bogotá) se liquida la semana anterior y cada hora se calculan los
      anticipos. Aquí puedes generarlos a mano, ejecutar la dispersión de prueba y bloquear el
      anticipo de una agencia.
    </p>
    <div class="mt-4"><AvisoPrueba>Ejecutar solo marca la liquidación como pagada de prueba; no se transfiere nada.</AvisoPrueba></div>

    <!-- Generación manual -->
    <section class="tarjeta mt-6 p-5" aria-label="Generar liquidaciones">
      <div class="flex flex-wrap items-end gap-4">
        <label class="block">
          <span class="etiqueta-campo">Semana a liquidar (cualquier día de ella)</span>
          <input type="date" class="campo w-[190px]" bind:value={semana} />
        </label>
        <button class="btn btn-primario" disabled={generando || !semanaLista} onclick={generarSemana}>
          {generando ? 'Generando…' : 'Generar liquidaciones de la semana'}
        </button>
        <button class="btn btn-secundario" disabled={generando} onclick={anticiposAhora}>Generar anticipos ahora</button>
      </div>
      {#if rango}
        <p class="mt-3 text-[12.5px] text-slate-500 dark:text-slate-400">
          Semana del lunes {fechaTexto(rango.inicio)} al domingo {fechaTexto(rango.fin)}.
          {#if !semanaLista}
            <span class="font-semibold text-orange-700 dark:text-orange-300">Aún no termina: solo se liquidan semanas completas.</span>
          {/if}
        </p>
      {/if}
    </section>

    <!-- Liquidaciones -->
    <div class="mt-8 flex flex-wrap items-center gap-2">
      <h2 class="mr-2 text-[18px] font-extrabold tracking-tight">Liquidaciones</h2>
      {#each FILTROS as f}
        <button
          class="rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition
            {filtro === f.valor
            ? 'border-brand-600 bg-brand-600 text-white'
            : 'border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-ink-600 dark:text-slate-300 dark:hover:bg-ink-700'}"
          aria-pressed={filtro === f.valor}
          onclick={() => (filtro = f.valor)}
        >
          {f.etiqueta}
        </button>
      {/each}
    </div>

    {#if cargando}
      <div class="mt-4 space-y-3">{#each Array(3) as _}<Skeleton clase="h-[110px]" />{/each}</div>
    {:else if error}
      <Empty icono="📡" titulo="No pudimos cargar las liquidaciones" mensaje={error} />
    {:else if visibles.length === 0}
      <Empty icono="🧾" titulo="Nada por aquí" mensaje="No hay liquidaciones en esta categoría. Genera la semana o los anticipos." />
    {:else}
      <ul class="mt-4 space-y-3">
        {#each visibles as l (l.id)}
          {@const cuenta = cuentaDe(l.agency_id)}
          <li class="tarjeta p-5">
            <div class="flex flex-wrap items-center gap-3">
              <div class="min-w-0 flex-1">
                <div class="truncate text-[15px] font-extrabold">{l.agencies?.nombre ?? 'Agencia'}</div>
                <div class="text-[12px] text-slate-500 dark:text-slate-400">
                  {etiquetaTipoLiquidacion(l.tipo)} · {periodoTexto(l.periodo_inicio, l.periodo_fin)}
                </div>
              </div>
              <div class="text-right">
                <div class="text-[11px] text-slate-400">A pagar</div>
                <div class="text-[17px] font-extrabold tabular-nums">{cop(l.monto_a_pagar)}</div>
              </div>
              <StatusPill estado={l.estado} />
            </div>

            <dl class="mt-3 grid gap-x-6 gap-y-1 text-[12.5px] sm:grid-cols-4">
              <div><dt class="text-slate-400">Bruto</dt><dd class="font-semibold tabular-nums">{cop(l.monto_bruto)}</dd></div>
              <div><dt class="text-slate-400">Comisión</dt><dd class="font-semibold tabular-nums">{cop(l.comision)}</dd></div>
              <div><dt class="text-slate-400">Anticipos descontados</dt><dd class="font-semibold tabular-nums">{cop(l.anticipos_descontados)}</dd></div>
              <div>
                <dt class="text-slate-400">Cuenta</dt>
                <dd class="font-semibold {cuenta ? '' : 'text-orange-700 dark:text-orange-300'}">{textoCuenta(cuenta)}</dd>
              </div>
            </dl>
            {#if l.referencia_prueba}
              <p class="mt-2 text-[12px] text-slate-500 dark:text-slate-400">Referencia: <strong>{l.referencia_prueba}</strong></p>
            {/if}
            {#if notaEstado(l)}
              <p class="mt-2 text-[12px] text-slate-500 dark:text-slate-400">{notaEstado(l)}</p>
            {/if}

            {#if confirmando === l.id}
              <div class="mt-4 rounded-xl border border-slate-200/80 bg-paper p-4 dark:border-ink-600 dark:bg-ink-900" role="alertdialog" aria-label="Confirmar dispersión de prueba">
                <p class="text-[13px]">
                  Vas a registrar una <strong>dispersión de prueba</strong> de <strong>{cop(l.monto_a_pagar)}</strong>
                  a <strong>{l.agencies?.nombre ?? 'la agencia'}</strong> ({textoCuenta(cuenta)}). {AVISO_PRUEBA}.
                </p>
                {#if errorAccion}<p class="mt-2 text-[12.5px] font-medium text-red-600" role="alert">{errorAccion}</p>{/if}
                <div class="mt-3 flex justify-end gap-2">
                  <button class="btn btn-secundario py-1.5" onclick={() => (confirmando = null)}>Cancelar</button>
                  <button class="btn btn-primario py-1.5" disabled={ejecutando} onclick={() => ejecutar(l)}>
                    {ejecutando ? 'Registrando…' : 'Confirmar dispersión de prueba'}
                  </button>
                </div>
              </div>
            {/if}

            <div class="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200/70 pt-3 dark:border-ink-600">
              <button
                class="text-[12.5px] font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
                aria-expanded={abierta === l.id}
                onclick={() => alternarItems(l)}
              >
                {abierta === l.id ? 'Ocultar reservas' : 'Ver reservas'}
              </button>
              <div class="flex-1"></div>
              {#if puedeEjecutarse(l) && confirmando !== l.id}
                <button
                  class="btn btn-primario py-1.5"
                  onclick={() => {
                    confirmando = l.id;
                    errorAccion = '';
                  }}
                >
                  Ejecutar dispersión de prueba
                </button>
              {/if}
            </div>

            {#if abierta === l.id}
              <div class="mt-3 overflow-hidden rounded-xl border border-slate-200/70 dark:border-ink-600">
                {#if items.length === 0}
                  <p class="px-4 py-3 text-[12.5px] text-slate-400">Cargando reservas…</p>
                {:else}
                  <ItemsLiquidacion {items} />
                {/if}
              </div>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}

    <!-- Anticipos por agencia -->
    <h2 class="mt-10 text-[18px] font-extrabold tracking-tight">Anticipos por agencia</h2>
    <p class="mt-1 text-[12.5px] text-slate-500 dark:text-slate-400">
      Una agencia bloqueada deja de recibir anticipos nuevos; sus liquidaciones semanales siguen igual.
    </p>
    {#if !cargando && verificadas.length > 0}
      <ul class="mt-3 divide-y divide-slate-200/70 overflow-hidden rounded-2xl border border-slate-200/80 bg-white dark:divide-ink-600 dark:border-ink-600 dark:bg-ink-800">
        {#each verificadas as a (a.id)}
          <li class="flex flex-wrap items-center gap-3 px-5 py-3">
            <div class="min-w-0 flex-1">
              <div class="truncate text-[14px] font-bold">{a.nombre}</div>
              <div class="text-[12px] text-slate-500 dark:text-slate-400">
                Anticipos: {a.anticipo_bloqueado ? 'bloqueados' : 'habilitados'} · {textoCuenta(cuentaDe(a.id))}
              </div>
            </div>
            <button
              class="btn {a.anticipo_bloqueado ? 'btn-secundario' : 'btn-peligro'} py-1.5"
              onclick={() => alternarBloqueo(a)}
            >
              {a.anticipo_bloqueado ? 'Desbloquear anticipo' : 'Bloquear anticipo'}
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</div>
