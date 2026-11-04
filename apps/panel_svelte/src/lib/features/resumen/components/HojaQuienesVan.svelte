<script lang="ts">
  import { onMount, type Snippet } from 'svelte';
  import Icono from '$lib/shared/ui/Icono.svelte';
  import { ICONOS } from '$lib/shared/ui/iconos';

  /**
   * «Quiénes van» como hoja inferior (celular): diálogo modal con el foco atrapado, que se cierra con Esc, con la
   * cortina o con su botón. Quien la abre devuelve el foco al bloque que la abrió (la hoja no sabe cuál fue).
   */
  let { onclose, children }: { onclose: () => void; children: Snippet } = $props();

  let hoja: HTMLElement;
  let cerrar: HTMLButtonElement;

  onMount(() => cerrar.focus());

  const FOCALIZABLES = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

  function alTeclear(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      onclose();
      return;
    }
    if (e.key !== 'Tab') return;
    const dentro = [...hoja.querySelectorAll<HTMLElement>(FOCALIZABLES)];
    if (dentro.length === 0) return;
    const primero = dentro[0];
    const ultimo = dentro[dentro.length - 1];
    const activo = document.activeElement;
    if (!hoja.contains(activo)) {
      e.preventDefault();
      primero.focus();
    } else if (e.shiftKey && activo === primero) {
      e.preventDefault();
      ultimo.focus();
    } else if (!e.shiftKey && activo === ultimo) {
      e.preventDefault();
      primero.focus();
    }
  }
</script>

<svelte:window onkeydown={alTeclear} />

<button type="button" class="fixed inset-0 z-20 cursor-default bg-black/35" tabindex="-1" aria-hidden="true" onclick={onclose}></button>
<div
  bind:this={hoja}
  class="hoja fixed inset-x-0 bottom-[calc(68px+env(safe-area-inset-bottom))] z-[25] max-h-[min(62vh,460px)] overflow-y-auto rounded-[30px_8px_0_0] border border-b-0 border-linea bg-superficie px-4 pt-2 pb-4 shadow-[0_-16px_32px_-14px_rgb(0_0_0/0.4)]"
  role="dialog"
  aria-modal="true"
  aria-labelledby="h-quienes"
>
  <div class="mx-auto mb-1.5 h-[5px] w-11 rounded-full bg-contorno" aria-hidden="true"></div>
  <div class="mb-2 flex items-center justify-between">
    <h2 id="h-quienes" class="text-[26px] leading-[1.1]">Quiénes van</h2>
    <button bind:this={cerrar} type="button" class="boton-icono" aria-label="Cerrar Quiénes van" onclick={onclose}>
      <Icono trazo={ICONOS.cerrar} clase="size-5" />
    </button>
  </div>
  {@render children()}
</div>

<style>
  .hoja {
    animation: sube 0.22s ease-out;
  }
  @keyframes sube {
    from {
      transform: translateY(24px);
      opacity: 0;
    }
    to {
      transform: none;
      opacity: 1;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .hoja {
      animation: none;
    }
  }
</style>
