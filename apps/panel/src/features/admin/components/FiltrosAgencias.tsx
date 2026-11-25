import type { Dispatch, SetStateAction } from 'react';
import Chips from '@/shared/ui/Chips';
import Campo from '@/shared/ui/Campo';
import type { FiltroAgencias } from '@/features/agencias/model/verificacion';

const FILTROS: { valor: FiltroAgencias; etiqueta: string }[] = [
  { valor: 'pendientes', etiqueta: 'Por verificar' },
  { valor: 'atencion', etiqueta: 'RNT por renovar' },
  { valor: 'verificadas', etiqueta: 'Verificadas' },
  { valor: 'rechazadas', etiqueta: 'Rechazadas' },
  { valor: 'todas', etiqueta: 'Todas' },
];

export default function FiltrosAgencias({
  filtro,
  conteos,
  busqueda,
  setBusqueda,
  onelegir,
}: {
  filtro: FiltroAgencias;
  conteos: Record<FiltroAgencias, number>;
  /** La búsqueda la guarda el padre: el valor y su setter. */
  busqueda: string;
  setBusqueda: Dispatch<SetStateAction<string>>;
  onelegir: (filtro: FiltroAgencias) => void;
}) {
  const opciones = FILTROS.map((f) => ({ ...f, cantidad: conteos[f.valor] }));

  return (
    <div className="mt-6 flex flex-wrap items-end gap-x-4 gap-y-3">
      <Chips etiqueta="Qué agencias ver" opciones={opciones} valor={filtro} onchange={(v) => onelegir(v as FiltroAgencias)} />
      <Campo
        etiqueta="Buscar agencias"
        clase="w-full sm:ml-auto sm:w-72"
        control={(atributos) => (
          <input
            {...atributos}
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Nombre, RNT o ciudad"
            className="campo"
          />
        )}
      />
    </div>
  );
}
