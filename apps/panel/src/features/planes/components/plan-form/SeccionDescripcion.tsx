import type { Dispatch, SetStateAction } from 'react';
import Campo from '@/shared/ui/Campo';
import type { PlanDraft } from '../../model/plan';
import Seccion from './Seccion';

export default function SeccionDescripcion({ d, setD }: { d: PlanDraft; setD: Dispatch<SetStateAction<PlanDraft>> }) {
  return (
    <Seccion titulo="Resumen y descripción">
      <div className="space-y-3">
        <Campo
          etiqueta="Resumen corto"
          control={(atributos) => (
            <input
              {...atributos}
              value={d.resumen}
              onChange={(e) => {
                const resumen = e.target.value;
                setD((d) => ({ ...d, resumen }));
              }}
              className="campo"
              placeholder="Una frase que venda el plan"
            />
          )}
        />
        <Campo
          etiqueta="Descripción completa"
          control={(atributos) => (
            <textarea
              {...atributos}
              rows={4}
              value={d.descripcion}
              onChange={(e) => {
                const descripcion = e.target.value;
                setD((d) => ({ ...d, descripcion }));
              }}
              className="campo resize-none"
            />
          )}
        />
      </div>
    </Seccion>
  );
}
