import { useState, type Dispatch, type SetStateAction } from 'react';
import Icono from '@/shared/ui/Icono';
import { ICONOS } from '@/shared/ui/iconos';
import { agregarIncluye, type PlanDraft } from '../../model/plan';
import Seccion from './Seccion';

const INTERRUPTORES = [
  ['incluyeTransporte', 'Transporte'],
  ['incluyeComida', 'Comida'],
  ['incluyeHospedaje', 'Hospedaje'],
] as const;

/** Interruptores de transporte/comida/hospedaje y la lista de ítems extra que incluye el plan. */
export default function SeccionIncluye({ d, setD }: { d: PlanDraft; setD: Dispatch<SetStateAction<PlanDraft>> }) {
  const [nuevoIncluye, setNuevoIncluye] = useState('');

  function agregar() {
    const lista = agregarIncluye(d.incluye, nuevoIncluye);
    if (lista) {
      setD((d) => ({ ...d, incluye: lista }));
      setNuevoIncluye('');
    }
  }

  return (
    <Seccion titulo="Qué incluye el precio">
      <div className="flex flex-wrap gap-x-6 gap-y-3">
        {INTERRUPTORES.map(([campo, etiqueta]) => (
          <label key={campo} className="flex items-center gap-2.5 font-semibold">
            <input
              type="checkbox"
              checked={d[campo]}
              onChange={(e) => {
                const marcado = e.target.checked;
                setD((d) => ({ ...d, [campo]: marcado }));
              }}
              className="switch"
            />
            {etiqueta}
          </label>
        ))}
      </div>
      {d.incluye.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2">
          {d.incluye.map((item, i) => (
            <li key={item} className="inline-flex items-center gap-1 rounded-pildora bg-relleno py-1 pr-1.5 pl-3.5 font-semibold text-tinta">
              {item}
              <button
                type="button"
                className="grid size-7 place-items-center rounded-pildora hover:bg-heliconia-bg hover:text-heliconia"
                aria-label={`Quitar ${item}`}
                onClick={() => setD((d) => ({ ...d, incluye: d.incluye.filter((_, j) => j !== i) }))}
              >
                <Icono trazo={ICONOS.cerrar} clase="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 flex gap-2">
        <input
          value={nuevoIncluye}
          onChange={(e) => setNuevoIncluye(e.target.value)}
          className="campo"
          placeholder="Otro ítem (ej. Guía certificado)"
          aria-label="Otro ítem que incluye el plan"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              agregar();
            }
          }}
        />
        <button type="button" className="boton-icono" aria-label="Agregar ítem" onClick={agregar}>
          <Icono trazo={ICONOS.mas} clase="size-4" />
        </button>
      </div>
    </Seccion>
  );
}
