import type { ReactNode } from 'react';

export interface Columna {
  /** Campo de la fila que muestra la celda cuando no se dibuja a medida. */
  clave: string;
  titulo: string;
  /** Cifras: alineadas a la derecha. */
  num?: boolean;
  /** La celda que encabeza la tarjeta en pantallas angostas (sin título delante). */
  principal?: boolean;
}

/** El texto de una celda sin `celda`: nada para null/undefined y el texto de cualquier otra cosa (también el 0 y false). */
const comoTexto = (v: unknown) => (v == null ? '' : String(v));

/**
 * Tabla de datos. Con ancho suficiente es una tabla; en pantallas angostas (≤ 820 px) cada fila pasa a ser una tarjeta:
 * la columna `principal` arriba y las demás como «título: valor», sin ocultar ningún dato.
 * Si se da `celda`, esa función dibuja TODAS las celdas (recibe la fila y la columna).
 *
 * Al pasar a tarjetas la tabla deja de ser `display: table`; los roles explícitos conservan su semántica para el lector de pantalla.
 */
export default function TablaDatos<T>({
  caption,
  columnas,
  filas,
  clave,
  celda,
  vacio,
  pie,
  clase = '',
}: {
  /** Qué contiene la tabla, para el lector de pantalla. */
  caption: string;
  columnas: Columna[];
  filas: T[];
  clave: (fila: T) => string;
  celda?: (fila: T, columna: Columna) => ReactNode;
  /** Qué se ve cuando no hay filas (con el motivo y, si se puede, qué hacer). */
  vacio?: ReactNode;
  /** Filas de totales (`<tr>`s) dentro del `<tfoot>`. */
  pie?: ReactNode;
  clase?: string;
}) {
  return (
    <div className={`tabla-datos overflow-x-auto ${clase}`}>
      <table className="tabla" role="table">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columnas.map((c) => (
              <th key={c.clave} scope="col" className={c.num ? 'num' : undefined}>
                {c.titulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody role="rowgroup">
          {filas.length > 0 ? (
            filas.map((fila) => (
              <tr key={clave(fila)} role="row">
                {columnas.map((c) => (
                  <td
                    key={c.clave}
                    role="cell"
                    data-th={c.titulo}
                    data-principal={c.principal ? '' : undefined}
                    className={c.num ? 'num' : undefined}
                  >
                    {celda ? celda(fila, c) : comoTexto((fila as Record<string, unknown>)[c.clave])}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr role="row">
              <td role="cell" colSpan={columnas.length} data-principal="" className="text-center text-tinta-2">
                {vacio}
              </td>
            </tr>
          )}
        </tbody>
        {pie != null && pie !== false && <tfoot role="rowgroup">{pie}</tfoot>}
      </table>
    </div>
  );
}
