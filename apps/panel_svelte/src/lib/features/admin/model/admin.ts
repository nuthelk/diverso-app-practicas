import { estadoVigencia, vigenciaSugerida, type Agency } from '$lib/features/agencias/model/agencia';
import { fechaTexto } from '$lib/shared/lib/format';
import { periodoTexto } from '$lib/features/liquidaciones/model/liquidaciones';

export type TipoAccion = 'verificar' | 'rechazar' | 'vigencia';

/** Fecha con la que abre el formulario: renovar una vigencia aún vigente suma un año a la actual. */
export function vigenciaInicial(a: Agency, tipo: TipoAccion, hoy = new Date()): string {
  return a.rnt_vigente_hasta && estadoVigencia(a, hoy) === 'vigente' && tipo === 'vigencia'
    ? vigenciaSugerida(new Date(a.rnt_vigente_hasta + 'T00:00:00'))
    : vigenciaSugerida(hoy);
}

export function avisoSemanaGenerada(r: {
  periodo_inicio: string;
  periodo_fin: string;
  liquidaciones: number;
  items: number;
}): string {
  const semana = `Semana del ${periodoTexto(r.periodo_inicio, r.periodo_fin)}`;
  return r.liquidaciones === 0
    ? `${semana}: no había nada nuevo por liquidar.`
    : `${semana}: ${r.liquidaciones} liquidaciones con ${r.items} items.`;
}

export function avisoAnticiposGenerados(r: { liquidaciones: number; items: number }): string {
  return r.liquidaciones === 0
    ? 'No había anticipos nuevos por generar.'
    : `Anticipos generados: ${r.liquidaciones} liquidaciones con ${r.items} reservas.`;
}

/** Lo que dice el botón que envía el formulario: la acción tal como ocurre, no «Confirmar» a secas. */
export function etiquetaEnviar(a: Agency, tipo: TipoAccion): string {
  if (tipo === 'verificar') return 'Verificar agencia';
  if (tipo === 'vigencia') return 'Guardar vigencia';
  return a.estado_verificacion === 'verificado' ? 'Quitar verificación' : 'Rechazar agencia';
}

/** Qué cambia para la agencia al enviar el formulario, a la vista antes de confirmar. */
export function consecuenciaAccion(a: Agency, tipo: TipoAccion, fechaVigencia: string): string {
  const hasta = fechaVigencia ? `hasta el ${fechaTexto(fechaVigencia)}` : 'mientras el RNT esté vigente';
  if (tipo === 'vigencia') return `La agencia seguirá vendiendo ${hasta}.`;
  if (tipo === 'verificar') {
    const rechazada = a.estado_verificacion === 'rechazado' ? 'Se quita el rechazo: la' : 'La';
    return `${rechazada} agencia podrá publicar planes y vender ${hasta}.`;
  }
  return a.estado_verificacion === 'verificado'
    ? 'La agencia dejará de vender: sus planes dejan de mostrarse y de recibir reservas. Verá el motivo en su panel.'
    : 'La agencia seguirá sin poder publicar planes. Verá el motivo en su panel.';
}
