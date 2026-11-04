<script lang="ts">
  /** Una cifra con su etiqueta (va dentro de un `<dl>`). La tinta indica de qué lado de la plata está. */
  let {
    etiqueta,
    valor,
    tono = 'neutro',
    clase = '',
  }: { etiqueta: string; valor: string; tono?: 'neutro' | 'acento' | 'alerta' | 'ok'; clase?: string } = $props();

  const TINTAS = { neutro: '', acento: 'text-helecho', alerta: 'text-prueba-ink', ok: 'text-helecho' } as const;
</script>

<div class="tarjeta px-4 py-4 sm:px-5 {clase}">
  <dt class="text-[14px] font-bold text-tinta-2">{etiqueta}</dt>
  <dd class="cifra mt-1 text-[23px] whitespace-nowrap sm:text-[30px] leading-[1.1] font-bold {TINTAS[tono]}">{valor}</dd>
</div>
