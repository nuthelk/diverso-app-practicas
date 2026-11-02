import { estadoVigencia, vigenciaSugerida, type Agency } from '@/features/agencias/agencia';
import { periodoTexto } from '@/features/liquidaciones/liquidaciones';

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
