import AlertaError from '@/shared/ui/AlertaError';
import Spinner from '@/shared/ui/Spinner';
import { plural } from '@/shared/lib/format';
import { diaLargo } from '../model/fechas';
import { cuposDeSalida, type EstadoQuienes, type ReservaDeSalida } from '../model/quienes-van';
import type { Salida } from '../model/salidas';

/** «Quiénes van» de una salida: plan, día y hora, cupos y las reservas vivas (nombre corto y personas), nunca contacto. */
export default function QuienesVan({
  salida,
  estado,
  reservas,
  onreintentar,
}: {
  salida: Salida;
  estado: EstadoQuienes;
  reservas: ReservaDeSalida[];
  onreintentar: () => void;
}) {
  return (
    <>
      <p className="flex flex-wrap gap-x-6 gap-y-1 text-detalle text-tinta-2">
        <span data-q-fecha="">
          <b className="text-tinta">Quiénes van</b> · {salida.titulo}, {diaLargo(salida.fecha)}, {salida.yaSalio ? 'salió' : 'sale'} a las{' '}
          {salida.hora}
        </span>{' '}
        <span data-q-cupos="">{cuposDeSalida(salida)}</span>
      </p>

      <div aria-live="polite">
        {estado === 'cargando' ? (
          <div className="mt-3 flex items-center gap-2 text-tinta-2" role="status">
            <Spinner clase="size-5 motion-reduce:animate-none" /> Buscando quiénes van…
          </div>
        ) : estado === 'error' ? (
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2" data-q-error="">
            <AlertaError>No pudimos cargar quiénes van.</AlertaError>
            <button type="button" className="btn btn-secundario btn-chico" onClick={onreintentar}>
              Reintentar
            </button>
          </div>
        ) : reservas.length === 0 ? (
          <p className="mt-3 text-tinta-2" data-q-vacio="">
            Aún nadie reservó esta salida
          </p>
        ) : (
          <ul className="mt-2 grid gap-x-8 sm:grid-cols-[repeat(auto-fill,minmax(280px,1fr))]" data-reservas="">
            {reservas.map((r) => (
              <li key={r.id} className="flex items-center gap-2.5 border-t border-linea py-2" data-reserva="">
                <span className="min-w-0 font-semibold">{r.nombre}</span>{' '}
                {r.pendiente && (
                  <span className="pildora pildora-alerta" data-pendiente="">
                    pendiente de pago
                  </span>
                )}{' '}
                <span className="cifra ml-auto font-normal whitespace-nowrap text-tinta-2" data-pax="">
                  <b className="text-tinta">{r.personas}</b> {plural(r.personas, 'persona', 'personas')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
