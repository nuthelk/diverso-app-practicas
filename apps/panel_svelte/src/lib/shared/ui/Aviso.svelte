<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icono from './Icono.svelte';
  import { ICONOS } from './iconos';
  import { BROTES_AVISO, TONOS_AVISO } from './tonos';

  /** Franja de aviso con el ícono en un brote, tinte del tono y, si hace falta, una acción a la derecha. */
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

<div
  class="flex flex-wrap items-center gap-x-3.5 gap-y-2 rounded-[8px_24px_8px_24px] border px-4 py-3 text-[15px] leading-[1.45] {TONOS_AVISO[tono]}"
  {role}
>
  <span class="grid size-9 shrink-0 place-items-center rounded-brote {BROTES_AVISO[tono]}">
    <Icono trazo={ICONO_DEL_TONO[tono]} clase="size-[19px]" />
  </span>
  <span class="min-w-[200px] flex-1">{@render children()}</span>
  {#if accion}{@render accion()}{/if}
</div>
