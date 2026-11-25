import type { VerificationLog } from '@/features/agencias/model/agencia';

const ETIQUETA_ACCION: Record<VerificationLog['accion'], string> = {
  registrada: 'Registro enviado',
  verificada: 'Verificada',
  rechazada: 'Rechazada',
  reverificacion_requerida: 'Cambió RNT o matrícula · vuelve a verificación',
  vigencia_actualizada: 'Vigencia del RNT actualizada',
};

export default function HistorialAgencia({ historial }: { historial: VerificationLog[] }) {
  return (
    <ol className="space-y-3 border-t border-linea px-5 py-4 text-detalle">
      {historial.length > 0 ? (
        historial.map((h) => (
          <li key={h.id}>
            <div className="font-bold">{ETIQUETA_ACCION[h.accion]}</div>
            <div className="text-tinta-2">
              {new Date(h.created_at).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })} · RNT {h.numero_rnt}{' '}
              {h.vigente_hasta ? ` · vigente hasta ${h.vigente_hasta}` : ''} {h.motivo ? ` · ${h.motivo}` : ''}
            </div>
          </li>
        ))
      ) : (
        <li className="text-tinta-2">Sin registros todavía.</li>
      )}
    </ol>
  );
}
