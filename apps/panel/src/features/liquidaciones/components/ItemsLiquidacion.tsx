import TablaDatos, { type Columna } from '@/shared/ui/TablaDatos';
import { cop, fechaCorta } from '@/shared/lib/format';
import { etiquetaTipoItem, type LiquidacionItem } from '../model/liquidaciones';

const COLUMNAS: Columna[] = [
  { clave: 'reserva', titulo: 'Reserva', principal: true },
  { clave: 'plan', titulo: 'Plan' },
  { clave: 'fecha', titulo: 'Fecha' },
  { clave: 'concepto', titulo: 'Concepto' },
  { clave: 'bruto', titulo: 'Bruto', num: true },
  { clave: 'comision', titulo: 'Comisión', num: true },
  { clave: 'neto', titulo: 'Neto', num: true },
];

/** Los ajustes y los netos negativos van en la tinta de urgencia. */
const esAjuste = (it: LiquidacionItem) => it.tipo === 'ajuste' || it.monto_neto < 0;

function celda(it: LiquidacionItem, c: Columna) {
  switch (c.clave) {
    case 'reserva':
      return <span className="font-semibold whitespace-nowrap">{it.bookings?.codigo ?? '—'}</span>;
    case 'plan':
      return <span className="block max-w-sm truncate text-tinta-2">{it.bookings?.plan_dates?.plans?.titulo ?? '—'}</span>;
    case 'fecha':
      return (
        <span className="whitespace-nowrap">{it.bookings?.plan_dates?.fecha ? fechaCorta(it.bookings.plan_dates.fecha) : '—'}</span>
      );
    case 'concepto':
      return <span className={esAjuste(it) ? 'font-semibold text-heliconia' : ''}>{etiquetaTipoItem(it.tipo)}</span>;
    case 'bruto':
      return cop(it.monto_bruto);
    case 'comision':
      return <span className="text-prueba-ink">{cop(it.comision)}</span>;
    default:
      return <span className="font-bold">{cop(it.monto_neto)}</span>;
  }
}

export default function ItemsLiquidacion({ items }: { items: LiquidacionItem[] }) {
  return (
    <TablaDatos caption="Reservas de la liquidación" columnas={COLUMNAS} filas={items} clave={(it) => it.id} celda={celda} />
  );
}
