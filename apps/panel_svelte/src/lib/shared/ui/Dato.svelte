<script lang="ts">
  import type { Snippet } from 'svelte';

  /** Un dato de una tarjeta de lista (celular): su etiqueta y, debajo, el valor en la tipografía de cifras. Va dentro de un `<dl>`. */
  let {
    etiqueta,
    tono = 'neutro',
    clase = '',
    children,
  }: { etiqueta: string; tono?: 'neutro' | 'alerta' | 'ok'; clase?: string; children: Snippet } = $props();

  const TINTAS = { neutro: '', alerta: 'text-prueba-ink', ok: 'text-helecho' } as const;
</script>

<div class={clase}>
  <dt class="text-[14px] font-bold text-tinta-2">{etiqueta}</dt>
  <dd class="cifra mt-0.5 text-[19px] leading-tight {TINTAS[tono]}">{@render children()}</dd>
</div>
