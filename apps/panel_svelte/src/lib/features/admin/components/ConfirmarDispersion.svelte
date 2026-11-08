<script lang="ts">
  import Dialogo from '$lib/shared/ui/Dialogo.svelte';
  import AlertaError from '$lib/shared/ui/AlertaError.svelte';
  import { cop } from '$lib/shared/lib/format';
  import {
    AVISO_PRUEBA,
    textoCuenta,
    type CuentaResumen,
    type Liquidacion,
  } from '$lib/features/liquidaciones/model/liquidaciones';

  /**
   * La pregunta antes de registrar una dispersión de prueba. Es un diálogo (foco dentro, Escape y «Cancelar» desisten);
   * si el servidor la rechaza, el motivo se queda aquí y la pregunta sigue abierta.
   */
  let {
    liquidacion: l,
    cuenta,
    ejecutando,
    error,
    oncancelar,
    onconfirmar,
  }: {
    liquidacion: Liquidacion;
    cuenta: CuentaResumen | undefined;
    ejecutando: boolean;
    error: string;
    oncancelar: () => void;
    onconfirmar: () => void;
  } = $props();
</script>

<Dialogo abierto rol="alertdialog" titulo="Registrar dispersión de prueba" descripcion="{AVISO_PRUEBA}." oncerrar={oncancelar}>
  <p>
    Vas a registrar una <strong>dispersión de prueba</strong> de <strong>{cop(l.monto_a_pagar)}</strong>
    a <strong>{l.agencies?.nombre ?? 'la agencia'}</strong> ({textoCuenta(cuenta)}).
  </p>
  {#if error}<AlertaError clase="mt-3">{error}</AlertaError>{/if}
  {#snippet pie()}
    <button type="button" class="btn btn-secundario" onclick={oncancelar}>Cancelar</button>
    <button type="button" class="btn btn-primario" disabled={ejecutando} onclick={onconfirmar}>
      {ejecutando ? 'Registrando…' : 'Confirmar dispersión de prueba'}
    </button>
  {/snippet}
</Dialogo>
