import { useId, useLayoutEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import Icono from './Icono';
import { ICONOS } from './iconos';

/** Diálogos abiertos, el último arriba: solo el de arriba atiende Escape y Tab (una confirmación sobre un formulario). */
const abiertos: HTMLElement[] = [];

const ENFOCABLES =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Diálogo modal: foco inicial dentro (un control con `data-autofocus`, si no el primero del contenido, si no «Cerrar»),
 * Tab que no sale, Escape y clic en el fondo que piden cerrar, y el foco de vuelta a quien lo abrió al cerrarse.
 * Se pinta en <body> (con un portal), fuera de cualquier contenedor con transformaciones.
 */
export default function Dialogo(props: {
  abierto: boolean;
  titulo: string;
  descripcion?: string;
  /** `alertdialog` para una pregunta que exige respuesta. */
  rol?: 'dialog' | 'alertdialog';
  oncerrar: () => void;
  children?: ReactNode;
  /** Botones de acción, alineados a la derecha bajo el contenido. */
  pie?: ReactNode;
}) {
  if (!props.abierto) return null;
  return createPortal(<DialogoAbierto {...props} />, document.body);
}

function DialogoAbierto({
  titulo,
  descripcion,
  rol = 'dialog',
  oncerrar,
  children,
  pie,
}: Parameters<typeof Dialogo>[0]) {
  const uid = useId();
  const fondoRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // El oyente de teclado se registra una vez: lee siempre el `oncerrar` más reciente.
  const oncerrarRef = useRef(oncerrar);
  oncerrarRef.current = oncerrar;

  // Corre al montar (antes de pintar: el foco ya está adentro en el primer cuadro) y deshace todo al desmontar.
  useLayoutEffect(() => {
    const fondo = fondoRef.current!;
    const panel = panelRef.current!;
    const anterior = document.activeElement as HTMLElement | null;
    const desplazamiento = document.documentElement.style.overflow;
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
        oncerrarRef.current();
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

    return () => {
      document.removeEventListener('keydown', alTeclear);
      abiertos.splice(abiertos.indexOf(fondo), 1);
      document.documentElement.style.overflow = desplazamiento;
      if (anterior?.isConnected) anterior.focus();
    };
  }, []);

  return (
    // Escape (en el documento) y el botón «Cerrar» son el camino de teclado; el clic en el fondo es un atajo para el puntero.
    <div
      data-fondo-dialogo=""
      ref={fondoRef}
      className="fixed inset-0 z-[80] grid place-items-end bg-bosque/60 sm:place-items-center sm:p-4"
      onClick={(e) => e.target === e.currentTarget && oncerrar()}
    >
      <div
        ref={panelRef}
        role={rol}
        aria-modal="true"
        aria-labelledby={`${uid}-titulo`}
        aria-describedby={descripcion ? `${uid}-descripcion` : undefined}
        tabIndex={-1}
        className="flex max-h-[min(88vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-t-hoja border border-linea bg-superficie
        text-tinta shadow-[0_18px_40px_-12px_rgb(0_0_0/0.35)] outline-none [--anillo:var(--foco)] sm:rounded-hoja"
      >
        <div className="flex items-start justify-between gap-3 border-b border-linea px-5 pt-4 pb-3">
          <div className="min-w-0">
            <h2 id={`${uid}-titulo`} className="text-seccion">
              {titulo}
            </h2>{' '}
            {descripcion && (
              <p id={`${uid}-descripcion`} className="mt-0.5 text-detalle text-tinta-2">
                {descripcion}
              </p>
            )}
          </div>
          <button type="button" className="boton-icono" data-cerrar="" aria-label="Cerrar" onClick={oncerrar}>
            <Icono trazo={ICONOS.cerrar} clase="size-5" />
          </button>
        </div>{' '}
        {children != null && children !== false && (
          <div data-contenido="" className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {children}
          </div>
        )}{' '}
        {pie != null && pie !== false && (
          <div data-pie="" className="flex flex-wrap justify-end gap-2 border-t border-linea px-5 py-3">
            {pie}
          </div>
        )}
      </div>
    </div>
  );
}
