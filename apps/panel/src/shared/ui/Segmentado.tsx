import { useRef, type KeyboardEvent } from 'react';
import Icono from './Icono';

export type OpcionSegmento = { valor: string; etiqueta: string; icono?: string };

const PASO: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

/**
 * Elegir una opción entre pocas (Sistema / Claro / Oscuro): grupo de radios. Solo la elegida entra con Tab; las flechas
 * eligen la vecina y le pasan el foco.
 */
export default function Segmentado({
  opciones,
  valor,
  onchange,
  etiqueta,
  etiquetadoPor,
}: {
  opciones: OpcionSegmento[];
  valor: string;
  onchange: (nuevo: string) => void;
  /** Nombre del grupo; o `etiquetadoPor` con el id de una etiqueta visible. */
  etiqueta?: string;
  etiquetadoPor?: string;
}) {
  const botones = useRef<(HTMLButtonElement | null)[]>([]);

  function alTeclear(e: KeyboardEvent, i: number) {
    const paso = PASO[e.key];
    if (!paso) return;
    e.preventDefault();
    const siguiente = (i + paso + opciones.length) % opciones.length;
    onchange(opciones[siguiente].valor);
    botones.current[siguiente]?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label={etiqueta}
      aria-labelledby={etiquetadoPor}
      className="grid gap-0.5 rounded-pildora border border-contorno bg-niebla-2 p-[3px]"
      style={{ gridTemplateColumns: `repeat(${opciones.length}, minmax(0, 1fr))` }}
    >
      {opciones.map((o, i) => {
        const elegida = o.valor === valor;
        return (
          <button
            key={o.valor}
            type="button"
            role="radio"
            aria-checked={elegida}
            tabIndex={elegida ? 0 : -1}
            ref={(el) => {
              botones.current[i] = el;
            }}
            className={`inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-pildora px-1.5 text-detalle font-bold transition-colors
        ${elegida ? 'bg-helecho text-sobre-helecho' : 'text-tinta-2 hover:text-tinta'}`}
            onClick={() => onchange(o.valor)}
            onKeyDown={(e) => alTeclear(e, i)}
          >
            {o.icono && <Icono trazo={o.icono} clase="size-4" />}
            {o.etiqueta}
          </button>
        );
      })}
    </div>
  );
}
