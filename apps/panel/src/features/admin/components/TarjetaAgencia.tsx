import type { Dispatch, FormEvent, SetStateAction } from 'react';
import StatusPill from '@/shared/ui/StatusPill';
import Avatar from '@/shared/ui/Avatar';
import { fechaTexto } from '@/shared/lib/format';
import type { Agency, VerificationLog } from '@/features/agencias/model/agencia';
import { textoVigencia } from '@/features/agencias/model/verificacion';
import type { TipoAccion } from '../model/admin';
import FormularioAccionAgencia from './FormularioAccionAgencia';
import HistorialAgencia from './HistorialAgencia';

export default function TarjetaAgencia({
  agencia: a,
  accion,
  historialAbierto,
  historial,
  fechaVigencia,
  setFechaVigencia,
  motivo,
  setMotivo,
  confirmado,
  setConfirmado,
  procesando,
  errorAccion,
  onabrir,
  oncancelar,
  onejecutar,
  onhistorial,
}: {
  agencia: Agency;
  /** Acción en curso sobre esta agencia (null si no hay formulario abierto). */
  accion: TipoAccion | null;
  historialAbierto: boolean;
  historial: VerificationLog[];
  /** Los valores los guarda el padre: cada uno con su setter. */
  fechaVigencia: string;
  setFechaVigencia: Dispatch<SetStateAction<string>>;
  motivo: string;
  setMotivo: Dispatch<SetStateAction<string>>;
  confirmado: boolean;
  setConfirmado: Dispatch<SetStateAction<boolean>>;
  procesando: boolean;
  errorAccion: string;
  onabrir: (tipo: TipoAccion) => void;
  oncancelar: () => void;
  onejecutar: (e: FormEvent<HTMLFormElement>) => void;
  onhistorial: () => void;
}) {
  const vig = textoVigencia(a);

  return (
    <li className="tarjeta overflow-hidden">
      <div className="flex items-center gap-3 px-5 pt-4 pb-3">
        <Avatar iniciales={a.nombre} tam={44} />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-destacado max-sm:break-words max-sm:whitespace-normal">{a.nombre}</h2>
          <div className="text-detalle text-tinta-2">
            {a.ciudad}
            {a.created_at ? ` · registrada el ${fechaTexto(a.created_at)}` : ''}
          </div>
        </div>
        <StatusPill estado={a.estado_verificacion} />
      </div>

      <dl className="grid gap-x-6 gap-y-3 border-t border-linea px-5 py-4 sm:grid-cols-3">
        <div>
          <dt className="text-detalle text-tinta-2">RNT</dt>
          <dd className="text-destacado font-semibold tabular-nums">{a.numero_rnt}</dd>
        </div>
        <div>
          <dt className="text-detalle text-tinta-2">Matrícula mercantil</dt>
          <dd className="text-destacado font-semibold tabular-nums">{a.matricula_camara_comercio}</dd>
        </div>
        <div>
          <dt className="text-detalle text-tinta-2">Vigencia</dt>
          <dd className={`font-bold ${vig.clase}`}>{vig.texto}</dd>
        </div>
        {(a.email || a.telefono) && (
          <div className="sm:col-span-3">
            <dt className="text-detalle text-tinta-2">Contacto</dt>
            <dd>{[a.email, a.telefono].filter(Boolean).join(' · ')}</dd>
          </div>
        )}
      </dl>

      {a.estado_verificacion === 'rechazado' && a.motivo_rechazo && (
        <p className="mx-5 mb-4 rounded-campo bg-heliconia-bg px-3.5 py-3 text-detalle text-heliconia">
          Motivo del rechazo: {a.motivo_rechazo}
        </p>
      )}

      {accion && (
        <FormularioAccionAgencia
          agencia={a}
          tipo={accion}
          fechaVigencia={fechaVigencia}
          setFechaVigencia={setFechaVigencia}
          motivo={motivo}
          setMotivo={setMotivo}
          confirmado={confirmado}
          setConfirmado={setConfirmado}
          procesando={procesando}
          error={errorAccion}
          onsubmit={onejecutar}
          oncancelar={oncancelar}
        />
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-linea px-5 py-3">
        <button className="btn btn-texto -ml-3" aria-expanded={historialAbierto} onClick={onhistorial}>
          {historialAbierto ? 'Ocultar historial' : 'Ver historial'}
        </button>
        <div className="flex-1"></div>
        {!accion &&
          (a.estado_verificacion === 'pendiente' ? (
            <>
              <button className="btn btn-peligro" onClick={() => onabrir('rechazar')}>
                Rechazar
              </button>
              <button className="btn btn-primario" onClick={() => onabrir('verificar')}>
                Verificar
              </button>
            </>
          ) : a.estado_verificacion === 'verificado' ? (
            <>
              <button className="btn btn-peligro" onClick={() => onabrir('rechazar')}>
                Quitar verificación
              </button>
              <button className="btn btn-primario" onClick={() => onabrir('vigencia')}>
                Renovar vigencia RNT
              </button>
            </>
          ) : (
            <button className="btn btn-secundario" onClick={() => onabrir('verificar')}>
              Verificar agencia
            </button>
          ))}
      </div>

      {historialAbierto && <HistorialAgencia historial={historial} />}
    </li>
  );
}
