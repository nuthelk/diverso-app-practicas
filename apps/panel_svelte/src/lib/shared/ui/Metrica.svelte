<script lang="ts">
  /**
   * Una cifra con su etiqueta (va dentro de un `<dl>`, suelta o en una `FranjaMetricas`). La tinta indica de qué lado de la
   * plata está; `sub` aclara el alcance de la cifra y `principal` la destaca sobre el monte oscuro.
   */
  let {
    etiqueta,
    valor,
    sub,
    tono = 'neutro',
    principal = false,
    clase = '',
  }: {
    etiqueta: string;
    valor: string;
    sub?: string;
    tono?: 'neutro' | 'acento' | 'alerta' | 'ok';
    principal?: boolean;
    clase?: string;
  } = $props();

  const TINTAS = { neutro: '', acento: 'text-helecho', alerta: 'text-prueba-ink', ok: 'text-helecho' } as const;
</script>

<div class="tarjeta px-4 py-4 sm:px-5 {principal ? 'monte border-bosque-2 bg-bosque text-sobre-bosque' : ''} {clase}">
  <dt class="text-detalle font-bold {principal ? 'text-sobre-bosque-2' : 'text-tinta-2'}">{etiqueta}</dt>
  <dd class="mt-1">
    <span class="cifra block text-seccion font-bold [overflow-wrap:anywhere] sm:text-pagina {principal ? '' : TINTAS[tono]}">{valor}</span>
    {#if sub}<span class="mt-0.5 block text-detalle {principal ? 'text-sobre-bosque-2' : 'text-tinta-2'}">{sub}</span>{/if}
  </dd>
</div>
