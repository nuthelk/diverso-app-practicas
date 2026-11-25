import type { Dispatch, SetStateAction } from 'react';
import Campo from '@/shared/ui/Campo';
import type { PlanDraft } from '../../model/plan';
import type { ErroresPolitica } from '../../model/politica';
import { numeroDe } from '../numero';

/** Horas y porcentajes de la política, sus errores (solo tras intentar guardar) y el texto que leerá el viajero. */
export default function PoliticaCancelacion({
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
  return (
    <div className="space-y-3 rounded-hoja-chica border border-linea bg-niebla p-4" role="group" aria-label="Política de cancelación">
      <h3 className="text-destacado">Política de cancelación y reembolsos</h3>
      <p className="text-tinta-2">
        Las horas se cuentan hacia atrás desde la fecha del plan y su hora de salida. Con estos números se calcula el
        reembolso al cancelar y se escribe el texto que ve el viajero.
      </p>
      <div className="grid gap-3 min-[640px]:grid-cols-3">
        <Campo
          etiqueta="Cancelación gratuita hasta (horas antes) *"
          error={intentado ? errores.horasGratis : undefined}
          control={(atributos) => (
            <input
              {...atributos}
              data-campo="horasGratis"
              type="number"
              min="1"
              step="1"
              required
              value={d.horasCancelacionGratuita ?? ''}
              onChange={(e) => {
                // Vacío queda en null: `validarPolitica` lo rechaza.
                const horasCancelacionGratuita = numeroDe(e.target.value) as number;
                setD((d) => ({ ...d, horasCancelacionGratuita }));
              }}
              className="campo"
            />
          )}
        />
        <Campo
          etiqueta="Reembolso parcial hasta (horas antes)"
          error={intentado ? errores.horasParcial : undefined}
          control={(atributos) => (
            <input
              {...atributos}
              data-campo="horasParcial"
              type="number"
              min="0"
              step="1"
              value={d.horasReembolsoParcial ?? ''}
              onChange={(e) => {
                const horasReembolsoParcial = numeroDe(e.target.value);
                setD((d) => ({ ...d, horasReembolsoParcial }));
              }}
              className="campo"
              placeholder="Opcional"
            />
          )}
        />
        <Campo
          etiqueta="Porcentaje de reembolso parcial (1–99)"
          error={intentado ? errores.porcentajeParcial : undefined}
          control={(atributos) => (
            <input
              {...atributos}
              data-campo="porcentajeParcial"
              type="number"
              min="1"
              max="99"
              step="1"
              value={d.porcentajeReembolsoParcial ?? ''}
              onChange={(e) => {
                const porcentajeReembolsoParcial = numeroDe(e.target.value);
                setD((d) => ({ ...d, porcentajeReembolsoParcial }));
              }}
              className="campo"
              placeholder="Opcional"
            />
          )}
        />
      </div>
      <Campo
        etiqueta="Notas de la política (opcional)"
        ayuda="Frases que no cambian el reembolso: se muestran al viajero después de la política."
        error={intentado ? errores.notas : undefined}
        control={(atributos) => (
          <textarea
            {...atributos}
            data-campo="notas"
            rows={2}
            value={d.politicaNotas}
            onChange={(e) => {
              const politicaNotas = e.target.value;
              setD((d) => ({ ...d, politicaNotas }));
            }}
            className="campo resize-none"
            placeholder="Ej.: Avisar restricciones alimentarias."
          />
        )}
      />
      <p data-testid="politica-texto">
        <span className="font-semibold">Lo que verá el viajero:</span> {textoVistaPrevia}
      </p>
    </div>
  );
}
