<script lang="ts">
  /** Una cifra con su etiqueta (va dentro de un `<dl>`). La tinta indica de qué lado de la plata está. */
  let {
    etiqueta,
    valor,
    tono = 'neutro',
  }: { etiqueta: string; valor: string; tono?: 'neutro' | 'acento' | 'alerta' | 'ok' } = $props();

  const TINTAS = { neutro: '', acento: 'text-acento-ink', alerta: 'text-alert-ink', ok: 'text-ok-ink' } as const;
</script>

<div class="tarjeta px-5 py-3.5">
  <dt class="text-[12.5px] font-semibold text-suave">{etiqueta}</dt>
  <dd class="mt-1 text-[20px] leading-[1.15] font-extrabold tracking-[-0.02em] tabular-nums {TINTAS[tono]}">{valor}</dd>
</div>
