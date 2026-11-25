import StatusPill from '@/shared/ui/StatusPill';
import ItemsLiquidacion from '@/features/liquidaciones/components/ItemsLiquidacion';
import { cop } from '@/shared/lib/format';
import {
  etiquetaTipoLiquidacion,
  notaEstado,
  periodoTexto,
  puedeEjecutarse,
  textoCuenta,
  type CuentaResumen,
  type Liquidacion,
  type LiquidacionItem,
} from '@/features/liquidaciones/model/liquidaciones';

export default function TarjetaLiquidacion({
  liquidacion: l,
  cuenta,
  abierta,
  items,
  onejecutar,
  onitems,
}: {
  liquidacion: Liquidacion;
  cuenta: CuentaResumen | undefined;
  abierta: boolean;
  items: LiquidacionItem[];
  /** Abre la confirmación; el backend solo se llama al confirmarla. */
  onejecutar: () => void;
  onitems: () => void;
}) {
  const nota = notaEstado(l);

  return (
    <li className="tarjeta overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 px-5 pt-4 pb-3">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-destacado max-sm:break-words max-sm:whitespace-normal">{l.agencies?.nombre ?? 'Agencia'}</h2>
          <div className="text-detalle text-tinta-2">
            {etiquetaTipoLiquidacion(l.tipo)} · {periodoTexto(l.periodo_inicio, l.periodo_fin)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-detalle font-bold text-tinta-2">A pagar</div>
          <div className="cifra text-seccion font-bold">{cop(l.monto_a_pagar)}</div>
        </div>
        <StatusPill estado={l.estado} />
      </div>

      <dl className="grid gap-x-6 gap-y-3 border-t border-linea px-5 py-4 sm:grid-cols-4">
        <div>
          <dt className="text-detalle text-tinta-2">Bruto</dt>
          <dd className="cifra text-destacado">{cop(l.monto_bruto)}</dd>
        </div>
        <div>
          <dt className="text-detalle text-tinta-2">Comisión</dt>
          <dd className="cifra text-destacado">{cop(l.comision)}</dd>
        </div>
        <div>
          <dt className="text-detalle text-tinta-2">Anticipos descontados</dt>
          <dd className="cifra text-destacado">{cop(l.anticipos_descontados)}</dd>
        </div>
        <div>
          <dt className="text-detalle text-tinta-2">Cuenta</dt>
          <dd className={`font-bold ${cuenta ? '' : 'text-prueba-ink'}`}>{textoCuenta(cuenta)}</dd>
        </div>
      </dl>
      {(l.referencia_prueba || nota) && (
        <div className="space-y-1 px-5 pb-4 text-detalle text-tinta-2">
          {l.referencia_prueba && (
            <p>
              Referencia: <strong>{l.referencia_prueba}</strong>
            </p>
          )}
          {nota && <p>{nota}</p>}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-linea px-5 py-3">
        <button className="btn btn-texto -ml-3" aria-expanded={abierta} onClick={onitems}>
          {abierta ? 'Ocultar reservas' : 'Ver reservas'}
        </button>
        <div className="flex-1"></div>
        {puedeEjecutarse(l) && (
          <button className="btn btn-primario" onClick={onejecutar}>
            Ejecutar dispersión de prueba
          </button>
        )}
      </div>

      {abierta && (
        <div className="border-t border-linea">
          {items.length === 0 ? (
            <p className="px-5 py-3 text-detalle text-tinta-2">Cargando reservas…</p>
          ) : (
            <ItemsLiquidacion items={items} />
          )}
        </div>
      )}
    </li>
  );
}
