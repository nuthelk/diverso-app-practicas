<script lang="ts">
  import Campo from '$lib/shared/ui/Campo.svelte';
  import AlertaError from '$lib/shared/ui/AlertaError.svelte';
  import type { Agency } from '$lib/features/agencias/model/agencia';
  import { consecuenciaAccion, etiquetaEnviar, type TipoAccion } from '../model/admin';

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
  const enviar = $derived(etiquetaEnviar(agencia, tipo));
</script>

<form class="border-t border-linea bg-niebla px-5 py-4" {onsubmit}>
  {#if tipo === 'rechazar'}
    <Campo
      etiqueta="Motivo del {agencia.estado_verificacion === 'verificado' ? 'retiro de la verificación' : 'rechazo'}"
      ayuda="Lo verá la agencia en su panel."
    >
      {#snippet control(atributos)}
        <textarea
          {...atributos}
          rows="2"
          required
          bind:value={motivo}
          class="campo resize-none"
          placeholder="Ej. el número de RNT no coincide con el registro oficial."
        ></textarea>
      {/snippet}
    </Campo>
  {:else}
    <Campo etiqueta="RNT vigente hasta" clase="max-w-64">
      {#snippet control(atributos)}
        <input {...atributos} type="date" required min={hoyISO} bind:value={fechaVigencia} class="campo" />
      {/snippet}
    </Campo>
    <label class="mt-3 flex items-start gap-2.5 text-cuerpo text-tinta-2">
      <input type="checkbox" bind:checked={confirmado} class="mt-0.5 size-5 shrink-0 accent-helecho" />
      Confirmo que contrasté el RNT {agencia.numero_rnt} y la matrícula
      {agencia.matricula_camara_comercio} en las fuentes oficiales.
    </label>
  {/if}

  <p class="mt-3 text-detalle text-tinta-2">{consecuenciaAccion(agencia, tipo, fechaVigencia)}</p>

  {#if error}<AlertaError clase="mt-3 text-detalle">{error}</AlertaError>{/if}

  <div class="mt-4 flex flex-wrap justify-end gap-2">
    <button type="button" class="btn btn-secundario" onclick={oncancelar}>Cancelar</button>
    {#if tipo === 'rechazar'}
      <button type="submit" class="btn btn-peligro" disabled={procesando || !motivo.trim()}>
        {procesando ? 'Guardando…' : enviar}
      </button>
    {:else}
      <button type="submit" class="btn btn-primario" disabled={procesando || !confirmado}>
        {procesando ? 'Guardando…' : enviar}
      </button>
    {/if}
  </div>
</form>
