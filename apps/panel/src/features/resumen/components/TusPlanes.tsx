import Tarjeta from '@/shared/ui/Tarjeta';
import { plural } from '@/shared/lib/format';
import type { PlanVendido } from '../model/tus-planes';

/** «Tus planes»: cuántos viajeros tiene cada plan en las salidas del período y qué tan llenas van, con el enlace a Planes. */
export default function TusPlanes({ planes }: { planes: PlanVendido[] }) {
  return (
    <div data-tus-planes="">
      <Tarjeta
        titulo="Tus planes"
        descripcion="Viajeros por plan en el período"
        accion={
          <a href="#/planes" className="enlace -my-3 inline-flex min-h-11 items-center text-detalle" aria-label="Ver todos los planes">
            Ver todos
          </a>
        }
      >
        {planes.length === 0 ? (
          <p className="text-detalle text-tinta-2" data-frase="">
            Sin salidas en este período.
          </p>
        ) : (
          <ul className="grid gap-3.5">
            {planes.map((p) => (
              // Los `{' '}` separan las etiquetas en el texto (se lee «Plan 12 3 salidas…», no «Plan123 salidas…»).
              <li key={p.id} data-plan={p.id}>
                <div className="flex justify-between gap-2 font-semibold">
                  <span>{p.titulo}</span> <span className="cifra">{p.personas}</span>
                </div>{' '}
                <div
                  className="my-1.5 h-2 overflow-hidden rounded-pildora border border-contorno bg-niebla-2"
                  role="img"
                  aria-label={`${p.titulo}: ${p.personas} ${plural(p.personas, 'viajero', 'viajeros')} en el período`}
                >
                  <i className="block h-full bg-helecho" style={{ width: `${p.ancho}%` }}></i>
                </div>{' '}
                <p className="text-detalle text-tinta-2">
                  {p.salidas} {plural(p.salidas, 'salida', 'salidas')} · {p.ocupacion} % de los cupos
                </p>
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>
    </div>
  );
}
