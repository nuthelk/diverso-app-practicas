<script lang="ts">
  import type { Agency } from '$lib/features/agencias/model/agencia';
  import type { TipoAccion } from '../model/admin';

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
  class="mt-4 rounded-hoja-chica border border-linea bg-niebla p-4"
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
    <label class="mt-3 flex items-start gap-2.5 text-[15px] text-tinta-2">
      <input type="checkbox" bind:checked={confirmado} class="mt-1 size-[18px] shrink-0 accent-helecho" />
      Confirmo que contrasté el RNT {agencia.numero_rnt} y la matrícula
      {agencia.matricula_camara_comercio} en las fuentes oficiales.
    </label>
  {/if}

  {#if error}
    <p class="mt-3 text-[15px] font-semibold text-heliconia" role="alert">{error}</p>
  {/if}

  <div class="mt-4 flex justify-end gap-2">
    <button type="button" class="btn btn-secundario " onclick={oncancelar}>Cancelar</button>
    {#if tipo === 'rechazar'}
      <button type="submit" class="btn btn-peligro " disabled={procesando || !motivo.trim()}>
        {procesando ? 'Guardando…' : 'Confirmar rechazo'}
      </button>
    {:else}
      <button type="submit" class="btn btn-primario " disabled={procesando || !confirmado}>
        {procesando ? 'Guardando…' : tipo === 'verificar' ? 'Verificar agencia' : 'Guardar vigencia'}
      </button>
    {/if}
  </div>
</form>
