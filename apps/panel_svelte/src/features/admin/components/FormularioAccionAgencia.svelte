<script lang="ts">
  import type { Agency } from '@/features/agencias/agencia';
  import type { TipoAccion } from '../admin';

  let {
    agencia,
    tipo,
    fechaVigencia = $bindable(),
    motivo = $bindable(),
    confirmado = $bindable(),
    procesando,
    error,
    onsubmit,
    oncancelar,
  }: {
    agencia: Agency;
    tipo: TipoAccion;
    fechaVigencia: string;
    motivo: string;
    confirmado: boolean;
    procesando: boolean;
    error: string;
    onsubmit: (e: SubmitEvent) => void;
    oncancelar: () => void;
  } = $props();

  const hoyISO = new Date().toISOString().slice(0, 10);
</script>

<form
  class="mt-4 rounded-xl border border-slate-200/80 bg-paper p-4 dark:border-ink-600 dark:bg-ink-900"
  {onsubmit}
>
  {#if tipo === 'rechazar'}
    <label class="block">
      <span class="etiqueta-campo">
        Motivo del {agencia.estado_verificacion === 'verificado' ? 'retiro de la verificación' : 'rechazo'}
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
      Confirmo que contrasté el RNT {agencia.numero_rnt} y la matrícula
      {agencia.matricula_camara_comercio} en las fuentes oficiales.
    </label>
  {/if}

  {#if error}
    <p class="mt-3 text-[12.5px] font-medium text-red-600" role="alert">{error}</p>
  {/if}

  <div class="mt-4 flex justify-end gap-2">
    <button type="button" class="btn btn-secundario py-1.5" onclick={oncancelar}>Cancelar</button>
    {#if tipo === 'rechazar'}
      <button type="submit" class="btn btn-peligro py-1.5" disabled={procesando || !motivo.trim()}>
        {procesando ? 'Guardando…' : 'Confirmar rechazo'}
      </button>
    {:else}
      <button type="submit" class="btn btn-primario py-1.5" disabled={procesando || !confirmado}>
        {procesando ? 'Guardando…' : tipo === 'verificar' ? 'Verificar agencia' : 'Guardar vigencia'}
      </button>
    {/if}
  </div>
</form>
