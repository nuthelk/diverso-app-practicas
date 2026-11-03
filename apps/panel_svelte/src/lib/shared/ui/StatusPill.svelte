<script lang="ts">
  let { estado }: { estado: string } = $props();

  type Tono = 'ok' | 'alerta' | 'error' | 'neutra';

  const MAPA: Record<string, { texto: string; tono: Tono }> = {
    verificado: { texto: 'Verificada', tono: 'ok' },
    rechazado: { texto: 'Rechazada', tono: 'error' },
    pendiente: { texto: 'Pendiente', tono: 'alerta' },
    en_verificacion: { texto: 'En verificación', tono: 'alerta' },
    confirmada: { texto: 'Confirmada', tono: 'ok' },
    pendiente_pago: { texto: 'Pendiente', tono: 'alerta' },
    cancelada: { texto: 'Cancelada', tono: 'error' },
    completada: { texto: 'Completada', tono: 'neutra' },
    publicado: { texto: 'Publicado', tono: 'ok' },
    borrador: { texto: 'Borrador', tono: 'neutra' },
    aprobado: { texto: 'Aprobado', tono: 'ok' },
    reembolsado: { texto: 'Reembolsado', tono: 'neutra' },
    pagada_prueba: { texto: 'Pagada (prueba)', tono: 'ok' },
    anulada: { texto: 'Anulada', tono: 'neutra' },
    compensada: { texto: 'Compensada', tono: 'neutra' },
    sin_saldo: { texto: 'Sin saldo', tono: 'neutra' },
    vigente: { texto: 'RNT vigente', tono: 'ok' },
    por_vencer: { texto: 'RNT por vencer', tono: 'alerta' },
    vencido: { texto: 'RNT vencido', tono: 'error' },
    sin_vigencia: { texto: 'Sin vigencia', tono: 'error' },
  };

  const info = $derived(MAPA[estado] ?? { texto: estado, tono: 'neutra' as Tono });
</script>

<span class="pildora pildora-{info.tono}">{info.texto}</span>
