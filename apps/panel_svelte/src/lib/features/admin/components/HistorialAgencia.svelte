<script lang="ts">
  import type { VerificationLog } from '$lib/features/agencias/model/agencia';

  let { historial }: { historial: VerificationLog[] } = $props();

  const ETIQUETA_ACCION: Record<VerificationLog['accion'], string> = {
    registrada: 'Registro enviado',
    verificada: 'Verificada',
    rechazada: 'Rechazada',
    reverificacion_requerida: 'Cambió RNT o matrícula · vuelve a verificación',
    vigencia_actualizada: 'Vigencia del RNT actualizada',
  };
</script>

<ol class="mt-4 space-y-3 border-l-2 border-dashed border-contorno pl-4">
  {#each historial as h (h.id)}
    <li class="text-[15px]">
      <div class="font-bold">{ETIQUETA_ACCION[h.accion]}</div>
      <div class="text-tinta-2">
        {new Date(h.created_at).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}
        · RNT {h.numero_rnt}
        {h.vigente_hasta ? ` · vigente hasta ${h.vigente_hasta}` : ''}
        {h.motivo ? ` · ${h.motivo}` : ''}
      </div>
    </li>
  {:else}
    <li class="text-[15px] text-tinta-2">Sin registros todavía.</li>
  {/each}
</ol>
