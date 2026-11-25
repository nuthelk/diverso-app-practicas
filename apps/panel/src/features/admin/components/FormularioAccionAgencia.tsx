import type { Dispatch, FormEvent, SetStateAction } from 'react';
import Campo from '@/shared/ui/Campo';
import AlertaError from '@/shared/ui/AlertaError';
import type { Agency } from '@/features/agencias/model/agencia';
import { consecuenciaAccion, etiquetaEnviar, type TipoAccion } from '../model/admin';

export default function FormularioAccionAgencia({
  agencia,
  tipo,
  fechaVigencia,
  setFechaVigencia,
  motivo,
  setMotivo,
  confirmado,
  setConfirmado,
  procesando,
  error,
  onsubmit,
  oncancelar,
}: {
  agencia: Agency;
  tipo: TipoAccion;
  /** Los valores los guarda el padre: cada uno con su setter. */
  fechaVigencia: string;
  setFechaVigencia: Dispatch<SetStateAction<string>>;
  motivo: string;
  setMotivo: Dispatch<SetStateAction<string>>;
  confirmado: boolean;
  setConfirmado: Dispatch<SetStateAction<boolean>>;
  procesando: boolean;
  error: string;
  onsubmit: (e: FormEvent<HTMLFormElement>) => void;
  oncancelar: () => void;
}) {
  const hoyISO = new Date().toISOString().slice(0, 10);
  const enviar = etiquetaEnviar(agencia, tipo);

  return (
    <form className="border-t border-linea bg-niebla px-5 py-4" onSubmit={onsubmit}>
      {tipo === 'rechazar' ? (
        <Campo
          etiqueta={`Motivo del ${agencia.estado_verificacion === 'verificado' ? 'retiro de la verificación' : 'rechazo'}`}
          ayuda="Lo verá la agencia en su panel."
          control={(atributos) => (
            <textarea
              {...atributos}
              rows={2}
              required
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="campo resize-none"
              placeholder="Ej. el número de RNT no coincide con el registro oficial."
            ></textarea>
          )}
        />
      ) : (
        <>
          <Campo
            etiqueta="RNT vigente hasta"
            clase="max-w-64"
            control={(atributos) => (
              <input
                {...atributos}
                type="date"
                required
                min={hoyISO}
                value={fechaVigencia}
                onChange={(e) => setFechaVigencia(e.target.value)}
                className="campo"
              />
            )}
          />
          <label className="mt-3 flex items-start gap-2.5 text-cuerpo text-tinta-2">
            <input
              type="checkbox"
              checked={confirmado}
              onChange={(e) => setConfirmado(e.target.checked)}
              className="mt-0.5 size-5 shrink-0 accent-helecho"
            />
            Confirmo que contrasté el RNT {agencia.numero_rnt} y la matrícula {agencia.matricula_camara_comercio} en las
            fuentes oficiales.
          </label>
        </>
      )}

      <p className="mt-3 text-detalle text-tinta-2">{consecuenciaAccion(agencia, tipo, fechaVigencia)}</p>

      {error && <AlertaError clase="mt-3 text-detalle">{error}</AlertaError>}

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button type="button" className="btn btn-secundario" onClick={oncancelar}>
          Cancelar
        </button>
        {tipo === 'rechazar' ? (
          <button type="submit" className="btn btn-peligro" disabled={procesando || !motivo.trim()}>
            {procesando ? 'Guardando…' : enviar}
          </button>
        ) : (
          <button type="submit" className="btn btn-primario" disabled={procesando || !confirmado}>
            {procesando ? 'Guardando…' : enviar}
          </button>
        )}
      </div>
    </form>
  );
}
