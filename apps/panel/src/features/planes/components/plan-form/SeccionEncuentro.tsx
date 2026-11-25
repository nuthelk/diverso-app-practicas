import type { Dispatch, SetStateAction } from 'react';
import Campo from '@/shared/ui/Campo';
import type { PlanDraft } from '../../model/plan';
import type { ErroresPolitica } from '../../model/politica';
import FotosPlan from './FotosPlan';
import PoliticaCancelacion from './PoliticaCancelacion';
import Seccion from './Seccion';

export default function SeccionEncuentro({
  d,
  setD,
  errores,
  intentado,
  textoVistaPrevia,
}: {
  d: PlanDraft;
  setD: Dispatch<SetStateAction<PlanDraft>>;
  errores: ErroresPolitica;
  intentado: boolean;
  textoVistaPrevia: string;
}) {
  /** Las fotos son una parte del borrador: su setter cambia solo `d.fotos`. */
  const setFotos: Dispatch<SetStateAction<string[]>> = (cambio) =>
    setD((d) => ({ ...d, fotos: typeof cambio === 'function' ? cambio(d.fotos) : cambio }));

  return (
    <Seccion titulo="Encuentro, cancelación y fotos">
      <div className="space-y-3">
        <div className="grid items-start gap-3 min-[640px]:grid-cols-[1fr_180px]">
          <Campo
            etiqueta="Punto de encuentro"
            control={(atributos) => (
              <input
                {...atributos}
                value={d.puntoEncuentro}
                onChange={(e) => {
                  const puntoEncuentro = e.target.value;
                  setD((d) => ({ ...d, puntoEncuentro }));
                }}
                className="campo"
              />
            )}
          />
          <Campo
            etiqueta="Hora de salida (hora de Colombia) *"
            error={intentado ? errores.horaSalida : undefined}
            control={(atributos) => (
              <input
                {...atributos}
                data-campo="horaSalida"
                type="time"
                required
                value={d.horaSalida}
                onChange={(e) => {
                  const horaSalida = e.target.value;
                  setD((d) => ({ ...d, horaSalida }));
                }}
                className="campo cifra"
              />
            )}
          />
        </div>
        <PoliticaCancelacion d={d} setD={setD} errores={errores} intentado={intentado} textoVistaPrevia={textoVistaPrevia} />
        <FotosPlan fotos={d.fotos} setFotos={setFotos} />
      </div>
    </Seccion>
  );
}
