<script lang="ts">
  import StatusPill from '$lib/shared/ui/StatusPill.svelte';
  import Avatar from '$lib/shared/ui/Avatar.svelte';
  import { fechaTexto } from '$lib/shared/lib/format';
  import type { Agency, VerificationLog } from '$lib/features/agencias/model/agencia';
  import { textoVigencia } from '$lib/features/agencias/model/verificacion';
  import type { TipoAccion } from '../model/admin';
  import FormularioAccionAgencia from './FormularioAccionAgencia.svelte';
  import HistorialAgencia from './HistorialAgencia.svelte';

  let {
    agencia: a,
    accion,
    historialAbierto,
    historial,
    fechaVigencia = $bindable(),
    motivo = $bindable(),
    confirmado = $bindable(),
    procesando,
    errorAccion,
    onabrir,
    oncancelar,
    onejecutar,
    onhistorial,
  }: {
    agencia: Agency;
    /** Acción en curso sobre esta agencia (null si no hay formulario abierto). */
    accion: TipoAccion | null;
    historialAbierto: boolean;
    historial: VerificationLog[];
    fechaVigencia: string;
    motivo: string;
    confirmado: boolean;
    procesando: boolean;
    errorAccion: string;
    onabrir: (tipo: TipoAccion) => void;
    oncancelar: () => void;
    onejecutar: (e: SubmitEvent) => void;
    onhistorial: () => void;
  } = $props();

  const vig = $derived(textoVigencia(a));
</script>

<li class="tarjeta p-5">
  <div class="flex items-center gap-3">
    <Avatar iniciales={a.nombre} tam={38} />
    <div class="min-w-0 flex-1">
      <div class="truncate max-sm:break-words max-sm:whitespace-normal text-[15px] font-extrabold">{a.nombre}</div>
      <div class="text-[12px] text-suave">
        {a.ciudad}{a.created_at ? ` · registrada el ${fechaTexto(a.created_at)}` : ''}
      </div>
    </div>
    <StatusPill estado={a.estado_verificacion} />
  </div>

  <dl class="mt-4 grid gap-x-6 gap-y-2 text-[12.5px] sm:grid-cols-3">
    <div>
      <dt class="text-suave">RNT</dt>
      <dd class="font-semibold tabular-nums">{a.numero_rnt}</dd>
    </div>
    <div>
      <dt class="text-suave">Matrícula mercantil</dt>
      <dd class="font-semibold tabular-nums">{a.matricula_camara_comercio}</dd>
    </div>
    <div>
      <dt class="text-suave">Vigencia</dt>
      <dd class="font-semibold {vig.clase}">{vig.texto}</dd>
    </div>
    {#if a.email || a.telefono}
      <div class="sm:col-span-3">
        <dt class="text-suave">Contacto</dt>
        <dd>{[a.email, a.telefono].filter(Boolean).join(' · ')}</dd>
      </div>
    {/if}
  </dl>

  {#if a.estado_verificacion === 'rechazado' && a.motivo_rechazo}
    <p class="mt-3 rounded-xl bg-heliconia-bg px-3.5 py-2.5 text-[12.5px] text-error-ink">
      Motivo del rechazo: {a.motivo_rechazo}
    </p>
  {/if}

  {#if accion}
    <FormularioAccionAgencia
      agencia={a}
      tipo={accion}
      bind:fechaVigencia
      bind:motivo
      bind:confirmado
      {procesando}
      error={errorAccion}
      onsubmit={onejecutar}
      {oncancelar}
    />
  {/if}

  <!-- Acciones -->
  <div
    class="mt-4 flex flex-wrap items-center gap-2 border-t border-linea pt-3.5"
  >
    <button
      class="btn btn-texto -ml-3 py-1.5 text-[12.5px]"
      aria-expanded={historialAbierto}
      onclick={onhistorial}
    >
      {historialAbierto ? 'Ocultar historial' : 'Ver historial'}
    </button>
    <div class="flex-1"></div>
    {#if !accion}
      {#if a.estado_verificacion === 'pendiente'}
        <button class="btn btn-peligro py-1.5" onclick={() => onabrir('rechazar')}>Rechazar</button>
        <button class="btn btn-primario py-1.5" onclick={() => onabrir('verificar')}>Verificar</button>
      {:else if a.estado_verificacion === 'verificado'}
        <button class="btn btn-peligro py-1.5" onclick={() => onabrir('rechazar')}>Retirar verificación</button>
        <button class="btn btn-primario py-1.5" onclick={() => onabrir('vigencia')}>Renovar vigencia RNT</button>
      {:else}
        <button class="btn btn-secundario py-1.5" onclick={() => onabrir('verificar')}>Reconsiderar y verificar</button>
      {/if}
    {/if}
  </div>

  {#if historialAbierto}
    <HistorialAgencia {historial} />
  {/if}
</li>
