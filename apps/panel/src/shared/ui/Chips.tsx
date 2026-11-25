export type OpcionChip = { valor: string; etiqueta: string; cantidad?: number };

/** Filtro de una lista: un chip por opción, `aria-pressed` en el elegido y, si se da, cuántos elementos tiene cada una. */
export default function Chips({
  opciones,
  valor,
  onchange,
  etiqueta,
  clase = '',
}: {
  opciones: OpcionChip[];
  valor: string;
  onchange: (nuevo: string) => void;
  /** Nombre del grupo para el lector de pantalla («Qué salidas ver»). */
  etiqueta: string;
  clase?: string;
}) {
  return (
    <div role="group" aria-label={etiqueta} className={`flex flex-wrap gap-1.5 ${clase}`}>
      {opciones.map((o) => (
        <button key={o.valor} type="button" className="chip" aria-pressed={o.valor === valor} onClick={() => onchange(o.valor)}>
          {o.etiqueta}
          {o.cantidad !== undefined && (
            <>
              {' '}
              <span className="tabular-nums opacity-90">{o.cantidad}</span>
            </>
          )}
        </button>
      ))}
    </div>
  );
}
