<script lang="ts">
  import Logo from '../components/Logo.svelte';
  import Skeleton from '../components/Skeleton.svelte';
  import StatusPill from '../components/StatusPill.svelte';
  import Avatar from '../components/Avatar.svelte';
  import Empty from '../components/Empty.svelte';
  import {
    todasLasAgencias,
    verificarAgencia,
    rechazarAgencia,
    actualizarVigencia,
    historialVerificacion,
    mensajeError,
  } from '../api';
  import { auth, signOut } from '../auth.svelte';
  import { avisar } from '../toast.svelte';
  import { fechaTexto } from '../format';
  import { estadoVigencia, vigenciaSugerida, type Agency, type VerificationLog } from '../types';
  import {
    conteosAgencias,
    filtrarAgencias,
    textoVigencia,
    type FiltroAgencias,
  } from '../agencias';

  type Accion = { tipo: 'verificar' | 'rechazar' | 'vigencia'; agencia: Agency };

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

  const FILTROS: { valor: FiltroAgencias; etiqueta: string }[] = [
    { valor: 'pendientes', etiqueta: 'Por verificar' },
    { valor: 'atencion', etiqueta: 'RNT por renovar' },
    { valor: 'verificadas', etiqueta: 'Verificadas' },
    { valor: 'rechazadas', etiqueta: 'Rechazadas' },
    { valor: 'todas', etiqueta: 'Todas' },
  ];

  function abrir(tipo: Accion['tipo'], a: Agency) {
    accion = { tipo, agencia: a };
    fechaVigencia = a.rnt_vigente_hasta && estadoVigencia(a) === 'vigente' && tipo === 'vigencia'
      ? vigenciaSugerida(new Date(a.rnt_vigente_hasta + 'T00:00:00'))
      : vigenciaSugerida();
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

  const ETIQUETA_ACCION: Record<VerificationLog['accion'], string> = {
    registrada: 'Registro enviado',
    verificada: 'Verificada',
    rechazada: 'Rechazada',
    reverificacion_requerida: 'Cambió RNT o matrícula · vuelve a verificación',
    vigencia_actualizada: 'Vigencia del RNT actualizada',
  };

  const hoyISO = new Date().toISOString().slice(0, 10);
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
    <a class="ml-3 text-[13px] font-semibold text-brand-600 hover:underline dark:text-brand-300" href="#/admin/dispersiones">
      Dispersiones de prueba
    </a>
    <div class="flex-1"></div>
    <span class="hidden text-[12.5px] text-slate-400 sm:inline">{auth.email}</span>
    <button class="btn btn-secundario py-1.5 text-[13px]" onclick={() => signOut()}>
      Cerrar sesión
    </button>
  </header>

  <div class="mx-auto max-w-[1040px] px-5 py-7 sm:px-7">
    <h1 class="text-[26px] font-extrabold tracking-tight">Verificación de agencias</h1>
    <p class="mt-1 max-w-[680px] text-[13.5px] leading-relaxed text-slate-500 dark:text-slate-400">
      Contrasta el RNT en el registro oficial y la matrícula en la Cámara de Comercio antes de
      aprobar. Una agencia solo vende mientras su RNT esté vigente; si cambia su RNT o su matrícula
      vuelve automáticamente a esta cola.
    </p>

    <!-- Filtros -->
    <div class="mt-6 flex flex-wrap items-center gap-2">
      {#each FILTROS as f}
        <button
          class="inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[12.5px]
            font-semibold transition
            {filtro === f.valor
            ? 'border-brand-600 bg-brand-600 text-white'
            : 'border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-ink-600 dark:text-slate-300 dark:hover:bg-ink-700'}"
          aria-pressed={filtro === f.valor}
          onclick={() => {
            filtro = f.valor;
            filtroElegido = true;
          }}
        >
          {f.etiqueta}
          <span
            class="rounded-full px-1.5 text-[11px] tabular-nums
              {filtro === f.valor
              ? 'bg-white/20'
              : f.valor === 'atencion' && conteos.atencion > 0
                ? 'bg-orange-500/15 text-orange-600'
                : 'bg-slate-500/12'}">{conteos[f.valor]}</span
          >
        </button>
      {/each}
      <div class="flex-1"></div>
      <input
        type="search"
        bind:value={busqueda}
        placeholder="Buscar por nombre, RNT o ciudad"
        class="campo w-full py-2 text-[13px] sm:w-[260px]"
        aria-label="Buscar agencias"
      />
    </div>

    {#if cargando}
      <div class="mt-6 space-y-3">
        {#each Array(4) as _}<Skeleton clase="h-[140px]" />{/each}
      </div>
    {:else if error}
      <Empty icono="📡" titulo="No pudimos cargar las agencias" mensaje={error} />
    {:else if visibles.length === 0}
      <Empty
        icono="✓"
        titulo="Nada pendiente aquí"
        mensaje={filtro === 'pendientes'
          ? 'No hay agencias esperando verificación.'
          : 'No hay agencias en esta categoría.'}
      />
    {:else}
      <ul class="mt-6 space-y-3">
        {#each visibles as a (a.id)}
          {@const vig = textoVigencia(a)}
          <li class="tarjeta p-5">
            <div class="flex items-center gap-3">
              <Avatar iniciales={a.nombre} tam={38} />
              <div class="min-w-0 flex-1">
                <div class="truncate text-[15px] font-extrabold">{a.nombre}</div>
                <div class="text-[12px] text-slate-500 dark:text-slate-400">
                  {a.ciudad}{a.created_at ? ` · registrada el ${fechaTexto(a.created_at)}` : ''}
                </div>
              </div>
              <StatusPill estado={a.estado_verificacion} />
            </div>

            <dl class="mt-4 grid gap-x-6 gap-y-2 text-[12.5px] sm:grid-cols-3">
              <div>
                <dt class="text-slate-400">RNT</dt>
                <dd class="font-semibold tabular-nums">{a.numero_rnt}</dd>
              </div>
              <div>
                <dt class="text-slate-400">Matrícula mercantil</dt>
                <dd class="font-semibold tabular-nums">{a.matricula_camara_comercio}</dd>
              </div>
              <div>
                <dt class="text-slate-400">Vigencia</dt>
                <dd class="font-semibold {vig.clase}">{vig.texto}</dd>
              </div>
              {#if a.email || a.telefono}
                <div class="sm:col-span-3">
                  <dt class="text-slate-400">Contacto</dt>
                  <dd>{[a.email, a.telefono].filter(Boolean).join(' · ')}</dd>
                </div>
              {/if}
            </dl>

            {#if a.estado_verificacion === 'rechazado' && a.motivo_rechazo}
              <p class="mt-3 rounded-xl bg-red-500/8 px-3.5 py-2.5 text-[12.5px] text-red-700 dark:text-red-400">
                Motivo del rechazo: {a.motivo_rechazo}
              </p>
            {/if}

            <!-- Formulario de la acción en curso -->
            {#if accion?.agencia.id === a.id}
              <form
                class="mt-4 rounded-xl border border-slate-200/80 bg-paper p-4 dark:border-ink-600 dark:bg-ink-900"
                onsubmit={ejecutar}
              >
                {#if accion.tipo === 'rechazar'}
                  <label class="block">
                    <span class="etiqueta-campo">
                      Motivo del {a.estado_verificacion === 'verificado' ? 'retiro de la verificación' : 'rechazo'}
                      (lo verá la agencia) *
                    </span>
                    <textarea
                      rows="2"
                      required
                      bind:value={motivo}
                      class="campo resize-none"
                      placeholder="Ej. el número de RNT no coincide con el registro oficial."
                    ></textarea>
                  </label>
                {:else}
                  <label class="block max-w-[260px]">
                    <span class="etiqueta-campo">RNT vigente hasta *</span>
                    <input type="date" required min={hoyISO} bind:value={fechaVigencia} class="campo" />
                  </label>
                  <label class="mt-3 flex items-start gap-2.5 text-[12.5px] text-slate-600 dark:text-slate-300">
                    <input type="checkbox" bind:checked={confirmado} class="mt-0.5 size-4 accent-brand-600" />
                    Confirmo que contrasté el RNT {a.numero_rnt} y la matrícula
                    {a.matricula_camara_comercio} en las fuentes oficiales.
                  </label>
                {/if}

                {#if errorAccion}
                  <p class="mt-3 text-[12.5px] font-medium text-red-600" role="alert">{errorAccion}</p>
                {/if}

                <div class="mt-4 flex justify-end gap-2">
                  <button type="button" class="btn btn-secundario py-1.5" onclick={() => (accion = null)}>
                    Cancelar
                  </button>
                  {#if accion.tipo === 'rechazar'}
                    <button type="submit" class="btn btn-peligro py-1.5" disabled={procesando || !motivo.trim()}>
                      {procesando ? 'Guardando…' : 'Confirmar rechazo'}
                    </button>
                  {:else}
                    <button type="submit" class="btn btn-primario py-1.5" disabled={procesando || !confirmado}>
                      {procesando
                        ? 'Guardando…'
                        : accion.tipo === 'verificar'
                          ? 'Verificar agencia'
                          : 'Guardar vigencia'}
                    </button>
                  {/if}
                </div>
              </form>
            {/if}

            <!-- Acciones -->
            <div
              class="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-200/70 pt-3.5 dark:border-ink-600"
            >
              <button
                class="text-[12.5px] font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
                aria-expanded={historialAbierto === a.id}
                onclick={() => alternarHistorial(a)}
              >
                {historialAbierto === a.id ? 'Ocultar historial' : 'Ver historial'}
              </button>
              <div class="flex-1"></div>
              {#if accion?.agencia.id !== a.id}
                {#if a.estado_verificacion === 'pendiente'}
                  <button class="btn btn-peligro py-1.5" onclick={() => abrir('rechazar', a)}>Rechazar</button>
                  <button class="btn btn-primario py-1.5" onclick={() => abrir('verificar', a)}>Verificar</button>
                {:else if a.estado_verificacion === 'verificado'}
                  <button class="btn btn-peligro py-1.5" onclick={() => abrir('rechazar', a)}>Retirar verificación</button>
                  <button class="btn btn-primario py-1.5" onclick={() => abrir('vigencia', a)}>Renovar vigencia RNT</button>
                {:else}
                  <button class="btn btn-secundario py-1.5" onclick={() => abrir('verificar', a)}>Reconsiderar y verificar</button>
                {/if}
              {/if}
            </div>

            {#if historialAbierto === a.id}
              <ol class="mt-3 space-y-2 border-l-2 border-slate-200 pl-4 dark:border-ink-600">
                {#each historial as h (h.id)}
                  <li class="text-[12.5px]">
                    <div class="font-semibold">{ETIQUETA_ACCION[h.accion]}</div>
                    <div class="text-slate-500 dark:text-slate-400">
                      {new Date(h.created_at).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}
                      · RNT {h.numero_rnt}
                      {h.vigente_hasta ? ` · vigente hasta ${h.vigente_hasta}` : ''}
                      {h.motivo ? ` · ${h.motivo}` : ''}
                    </div>
                  </li>
                {:else}
                  <li class="text-[12.5px] text-slate-400">Sin registros todavía.</li>
                {/each}
              </ol>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</div>
