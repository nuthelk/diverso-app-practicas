import type { Dispatch, SetStateAction } from 'react';
import Icono from '@/shared/ui/Icono';
import { ICONOS } from '@/shared/ui/iconos';
import type { ItinerarioPaso, PlanDraft } from '../../model/plan';
import Seccion from './Seccion';

export default function SeccionItinerario({ d, setD }: { d: PlanDraft; setD: Dispatch<SetStateAction<PlanDraft>> }) {
  /** Reemplaza el paso `i` con una copia nueva (el borrador no se muta). */
  const cambiarPaso = (i: number, cambio: Partial<ItinerarioPaso>) =>
    setD((d) => ({ ...d, itinerario: d.itinerario.map((p, j) => (j === i ? { hora: p.hora, actividad: p.actividad, ...cambio } : p)) }));

  return (
    <Seccion titulo="Itinerario">
      <div className="space-y-2">
        {d.itinerario.map((paso, i) => (
          // Sin clave propia: cada fila es la posición i.
          <div key={i} className="flex items-center gap-2">
            <input
              value={paso.hora}
              onChange={(e) => cambiarPaso(i, { hora: e.target.value })}
              className="campo cifra w-24 shrink-0 text-center"
              placeholder="07:00"
              aria-label={`Hora del paso ${i + 1}`}
            />
            <input
              value={paso.actividad}
              onChange={(e) => cambiarPaso(i, { actividad: e.target.value })}
              className="campo"
              placeholder="Actividad"
              aria-label={`Actividad del paso ${i + 1}`}
            />
            <button
              type="button"
              className="grid size-11 shrink-0 place-items-center rounded-pildora text-tinta-2 transition-colors hover:bg-heliconia-bg hover:text-heliconia"
              aria-label={`Quitar paso ${i + 1}`}
              onClick={() => setD((d) => ({ ...d, itinerario: d.itinerario.filter((_, j) => j !== i) }))}
            >
              <Icono trazo={ICONOS.papelera} clase="size-4" />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="btn btn-texto -ml-3 mt-3 text-helecho"
        onClick={() => setD((d) => ({ ...d, itinerario: [...d.itinerario, { hora: '', actividad: '' }] }))}
      >
        <Icono trazo={ICONOS.mas} clase="size-4" />
        Agregar paso
      </button>
    </Seccion>
  );
}
