import { useEffect, useId, useRef, useState, type FocusEvent, type KeyboardEvent } from 'react';
import Icono from './Icono';
import { ICONOS } from './iconos';

/** Dropdown propio (el <select> nativo no se puede estilizar en oscuro). */
export type Opcion = { valor: string; etiqueta: string };

/**
 * Botón + lista de opciones. Se nombra con `etiqueta` (texto) o `etiquetadoPor` (id de una etiqueta visible) y el
 * nombre del botón suma el valor elegido. Teclado: ↓/↑ abren; dentro, ↓/↑/Inicio/Fin mueven, Enter o espacio eligen,
 * Escape cierra y devuelve el foco al botón.
 */
export default function Select({
  opciones,
  valor,
  onchange,
  clase = '',
  etiqueta,
  etiquetadoPor,
}: {
  opciones: Opcion[];
  valor: string;
  onchange: (nuevo: string) => void;
  clase?: string;
  etiqueta?: string;
  etiquetadoPor?: string;
}) {
  const uid = useId();
  const idBoton = `${uid}-boton`;
  const idEtiqueta = `${uid}-etiqueta`;
  const nombre = etiquetadoPor ?? (etiqueta ? idEtiqueta : undefined);

  const [abierto, setAbierto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const boton = useRef<HTMLButtonElement>(null);
  const items = useRef<(HTMLLIElement | null)[]>([]);

  const etiquetaActual = opciones.find((o) => o.valor === valor)?.etiqueta ?? valor;

  // Al abrir, el foco va a la opción elegida (el efecto corre cuando la lista ya está dibujada).
  useEffect(() => {
    if (!abierto) return;
    const elegida = opciones.findIndex((o) => o.valor === valor);
    items.current[Math.max(elegida, 0)]?.focus();
    // Solo al abrir (depende de `abierto` y nada más): elegir con el teclado no debe volver a mover el foco.
  }, [abierto]);

  function abrir() {
    setAbierto(true);
  }

  function cerrar(devolverFoco = true) {
    setAbierto(false);
    if (devolverFoco) boton.current?.focus();
  }

  function elegir(v: string) {
    onchange(v);
    cerrar();
  }

  function alTeclearBoton(e: KeyboardEvent) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!abierto) abrir();
    }
  }

  function alTeclearLista(e: KeyboardEvent) {
    const lista = items.current.filter((li): li is HTMLLIElement => li !== null);
    const i = lista.indexOf((e.target as HTMLElement).closest('li') as HTMLLIElement);
    const ir = (n: number) => {
      e.preventDefault();
      lista[Math.min(Math.max(n, 0), lista.length - 1)]?.focus();
    };
    if (e.key === 'ArrowDown') ir(i + 1);
    else if (e.key === 'ArrowUp') ir(i - 1);
    else if (e.key === 'Home') ir(0);
    else if (e.key === 'End') ir(lista.length - 1);
    else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (i >= 0) elegir(opciones[i].valor);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation(); // dentro de un diálogo, Escape cierra la lista y no el diálogo
      cerrar();
    }
  }

  function alPerderFoco(e: FocusEvent) {
    if (!raiz.current?.contains(e.relatedTarget as Node)) setAbierto(false);
  }

  return (
    <div className={`relative min-w-0 ${clase}`} ref={raiz} onBlur={alPerderFoco}>
      {etiqueta && (
        <span id={idEtiqueta} className="sr-only">
          {etiqueta}
        </span>
      )}{' '}
      <button
        type="button"
        id={idBoton}
        ref={boton}
        className="campo flex w-full items-center justify-between gap-2 text-left"
        aria-haspopup="listbox"
        aria-expanded={abierto}
        aria-labelledby={nombre ? `${nombre} ${idBoton}` : undefined}
        onClick={() => (abierto ? cerrar(false) : abrir())}
        onKeyDown={alTeclearBoton}
      >
        <span className="truncate">{etiquetaActual}</span>
        <Icono trazo={ICONOS.chevron} clase={`size-4 text-tinta-2 transition-transform ${abierto ? 'rotate-180' : ''}`} />
      </button>{' '}
      {abierto && (
        // Las opciones reciben el foco (↓/↑) y el teclado se atiende en la lista.
        <ul
          className="aparecer absolute z-30 mt-1.5 max-h-60 w-full overflow-y-auto rounded-hoja-chica border
        border-linea bg-superficie py-1 shadow-xl shadow-black/20"
          role="listbox"
          aria-labelledby={nombre}
          onKeyDown={alTeclearLista}
        >
          {opciones.map((o, i) => (
            <li
              key={o.valor}
              role="option"
              tabIndex={-1}
              aria-selected={o.valor === valor}
              ref={(el) => {
                items.current[i] = el;
              }}
              className={`flex w-full cursor-pointer items-center gap-2 px-3.5 py-2.5 text-left text-cuerpo transition-colors
            ${o.valor === valor ? 'bg-niebla-2 font-bold text-helecho' : 'text-tinta hover:bg-niebla-2'}`}
              onClick={() => elegir(o.valor)}
            >
              {o.valor === valor ? <Icono trazo={ICONOS.check} clase="size-3.5" /> : <span className="size-3.5 shrink-0"></span>}
              {o.etiqueta}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
