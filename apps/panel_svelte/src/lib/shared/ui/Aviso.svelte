<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icono from './Icono.svelte';
  import { ICONOS } from './iconos';
  import { TONOS_AVISO } from './tonos';

  /** Franja de aviso con ícono, tinte del tono y, si hace falta, una acción a la derecha. */
  let {
    tono = 'alerta',
    role,
    children,
    accion,
  }: {
    tono?: keyof typeof TONOS_AVISO;
    role?: string;
    children: Snippet;
    accion?: Snippet;
  } = $props();

  // Una información no lleva el triángulo de advertencia.
  const ICONO_DEL_TONO = { info: ICONOS.info, alerta: ICONOS.alerta, error: ICONOS.alerta } as const;
</script>

<div class="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl px-4 py-[11px] text-[13.5px] leading-[1.35] {TONOS_AVISO[tono]}" {role}>
  <Icono trazo={ICONO_DEL_TONO[tono]} />
  <span class="min-w-[200px] flex-1">{@render children()}</span>
  {#if accion}{@render accion()}{/if}
</div>
