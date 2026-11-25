import Chips from '@/shared/ui/Chips';
import type { FiltroLiquidaciones } from '@/features/liquidaciones/model/liquidaciones';

const FILTROS: { valor: FiltroLiquidaciones; etiqueta: string }[] = [
  { valor: 'pendientes', etiqueta: 'Pendientes' },
  { valor: 'pagadas', etiqueta: 'Pagadas (prueba)' },
  { valor: 'todas', etiqueta: 'Todas' },
];

export default function FiltrosLiquidaciones({
  filtro,
  conteos,
  onelegir,
}: {
  filtro: FiltroLiquidaciones;
  conteos: Record<FiltroLiquidaciones, number>;
  onelegir: (filtro: FiltroLiquidaciones) => void;
}) {
  const opciones = FILTROS.map((f) => ({ ...f, cantidad: conteos[f.valor] }));

  return (
    <div className="mt-10 flex flex-wrap items-center gap-x-4 gap-y-2">
      <h2 className="text-seccion">Liquidaciones</h2>
      <Chips etiqueta="Qué liquidaciones ver" opciones={opciones} valor={filtro} onchange={(v) => onelegir(v as FiltroLiquidaciones)} />
    </div>
  );
}
