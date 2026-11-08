<script module lang="ts">
  /** Diálogos abiertos, el último arriba: solo el de arriba atiende Escape y Tab (una confirmación sobre un formulario). */
  const abiertos: HTMLElement[] = [];

  const ENFOCABLES =
    'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icono from './Icono.svelte';
  import { ICONOS } from './iconos';

  /**
   * Diálogo modal: foco inicial dentro (un control con `data-autofocus`, si no el primero del contenido, si no «Cerrar»),
   * Tab que no sale, Escape y clic en el fondo que piden cerrar, y el foco de vuelta a quien lo abrió al cerrarse.
   * Se pinta en <body>, fuera de cualquier contenedor con transformaciones.
   */
  let {
    abierto,
    titulo,
    descripcion,
    rol = 'dialog',
    oncerrar,
    children,
    pie,
  }: {
    abierto: boolean;
    titulo: string;
    descripcion?: string;
    /** `alertdialog` para una pregunta que exige respuesta. */
    rol?: 'dialog' | 'alertdialog';
    oncerrar: () => void;
    children?: Snippet;
    /** Botones de acción, alineados a la derecha bajo el contenido. */
    pie?: Snippet;
  } = $props();

  const uid = $props.id();

  function modal(fondo: HTMLElement) {
    const anterior = document.activeElement as HTMLElement | null;
    const desplazamiento = document.documentElement.style.overflow;
    const panel = fondo.firstElementChild as HTMLElement;
    document.body.appendChild(fondo);
    document.documentElement.style.overflow = 'hidden';
    abiertos.push(fondo);

    const inicial =
      fondo.querySelector<HTMLElement>('[data-autofocus]') ??
      [...fondo.querySelectorAll('[data-contenido], [data-pie]')].map((z) => z.querySelector<HTMLElement>(ENFOCABLES)).find(Boolean) ??
      fondo.querySelector<HTMLElement>('[data-cerrar]');
    (inicial ?? panel).focus();

    function alTeclear(e: KeyboardEvent) {
      if (abiertos.at(-1) !== fondo) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        oncerrar();
        return;
      }
      if (e.key !== 'Tab') return;
      const controles = [...panel.querySelectorAll<HTMLElement>(ENFOCABLES)];
      const primero = controles[0] ?? panel;
      const ultimo = controles.at(-1) ?? panel;
      const activo = document.activeElement;
      if (!panel.contains(activo)) {
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
    document.addEventListener('keydown', alTeclear);

    return {
      destroy() {
        document.removeEventListener('keydown', alTeclear);
        abiertos.splice(abiertos.indexOf(fondo), 1);
        document.documentElement.style.overflow = desplazamiento;
        fondo.remove(); // movido a <body>: el contenedor ya no lo arrastra al desmontarse
        if (anterior?.isConnected) anterior.focus();
      },
    };
  }
</script>

{#if abierto}
  <!-- Escape (en el documento) y el botón «Cerrar» son el camino de teclado; el clic en el fondo es un atajo para el puntero. -->
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div
    data-fondo-dialogo
    use:modal
    class="fixed inset-0 z-[80] grid place-items-end bg-bosque/60 sm:place-items-center sm:p-4"
    onclick={(e) => e.target === e.currentTarget && oncerrar()}
  >
    <div
      role={rol}
      aria-modal="true"
      aria-labelledby="{uid}-titulo"
      aria-describedby={descripcion ? `${uid}-descripcion` : undefined}
      tabindex="-1"
      class="flex max-h-[min(88vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-t-hoja border border-linea bg-superficie
        text-tinta shadow-[0_18px_40px_-12px_rgb(0_0_0/0.35)] outline-none [--anillo:var(--foco)] sm:rounded-hoja"
    >
      <div class="flex items-start justify-between gap-3 border-b border-linea px-5 pt-4 pb-3">
        <div class="min-w-0">
          <h2 id="{uid}-titulo" class="text-seccion">{titulo}</h2>
          {#if descripcion}<p id="{uid}-descripcion" class="mt-0.5 text-detalle text-tinta-2">{descripcion}</p>{/if}
        </div>
        <button type="button" class="boton-icono" data-cerrar aria-label="Cerrar" onclick={oncerrar}>
          <Icono trazo={ICONOS.cerrar} clase="size-5" />
        </button>
      </div>
      {#if children}<div data-contenido class="min-h-0 flex-1 overflow-y-auto px-5 py-4">{@render children()}</div>{/if}
      {#if pie}<div data-pie class="flex flex-wrap justify-end gap-2 border-t border-linea px-5 py-3">{@render pie()}</div>{/if}
    </div>
  </div>
{/if}
