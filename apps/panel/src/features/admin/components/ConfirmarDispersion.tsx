import Dialogo from '@/shared/ui/Dialogo';
import AlertaError from '@/shared/ui/AlertaError';
import { cop } from '@/shared/lib/format';
import { AVISO_PRUEBA, textoCuenta, type CuentaResumen, type Liquidacion } from '@/features/liquidaciones/model/liquidaciones';

/**
 * La pregunta antes de registrar una dispersión de prueba. Es un diálogo (foco dentro, Escape y «Cancelar» desisten);
 * si el servidor la rechaza, el motivo se queda aquí y la pregunta sigue abierta.
 */
export default function ConfirmarDispersion({
  liquidacion: l,
  cuenta,
  ejecutando,
  error,
  oncancelar,
  onconfirmar,
}: {
  liquidacion: Liquidacion;
  cuenta: CuentaResumen | undefined;
  ejecutando: boolean;
  error: string;
  oncancelar: () => void;
  onconfirmar: () => void;
}) {
  return (
    <Dialogo
      abierto
      rol="alertdialog"
      titulo="Registrar dispersión de prueba"
      descripcion={`${AVISO_PRUEBA}.`}
      oncerrar={oncancelar}
      pie={
        <>
          <button type="button" className="btn btn-secundario" onClick={oncancelar}>
            Cancelar
          </button>
          <button type="button" className="btn btn-primario" disabled={ejecutando} onClick={onconfirmar}>
            {ejecutando ? 'Registrando…' : 'Confirmar dispersión de prueba'}
          </button>
        </>
      }
    >
      <p>
        Vas a registrar una <strong>dispersión de prueba</strong> de <strong>{cop(l.monto_a_pagar)}</strong> a{' '}
        <strong>{l.agencies?.nombre ?? 'la agencia'}</strong> ({textoCuenta(cuenta)}).
      </p>
      {error && <AlertaError clase="mt-3">{error}</AlertaError>}
    </Dialogo>
  );
}
