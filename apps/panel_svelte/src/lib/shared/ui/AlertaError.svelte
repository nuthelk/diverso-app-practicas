<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icono from './Icono.svelte';
  import { ICONOS } from './iconos';

  /** Error en línea (falló un guardado, un campo no es válido): se anuncia como alerta y lleva ícono, no solo color. */
  let { id, clase = '', children }: { id?: string; clase?: string; children?: Snippet } = $props();
</script>

<p {id} class="flex items-start gap-2 font-semibold text-heliconia {clase}" role="alert">
  <Icono trazo={ICONOS.alerta} clase="mt-[3px] size-4" />
  <span>{#if children}{@render children()}{/if}</span>
</p>
