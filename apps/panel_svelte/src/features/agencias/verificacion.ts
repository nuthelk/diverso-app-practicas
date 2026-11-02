/** Lógica pura de la cola de verificación de agencias (Admin) y de su estado (Resumen). */

import { fechaTexto } from '@/shared/lib/format';
import { diasParaVencer, estadoVigencia, type Agency } from './agencia';

export type FiltroAgencias = 'pendientes' | 'atencion' | 'verificadas' | 'rechazadas' | 'todas';

/** Verificada pero con RNT vencido, por vencer o sin vigencia registrada. */
export function requiereAtencion(a: Agency, hoy = new Date()): boolean {
  return a.estado_verificacion === 'verificado' && estadoVigencia(a, hoy) !== 'vigente';
}

export function conteosAgencias(agencias: Agency[], hoy = new Date()): Record<FiltroAgencias, number> {
  return {
    pendientes: agencias.filter((a) => a.estado_verificacion === 'pendiente').length,
    atencion: agencias.filter((a) => requiereAtencion(a, hoy)).length,
    verificadas: agencias.filter((a) => a.estado_verificacion === 'verificado').length,
    rechazadas: agencias.filter((a) => a.estado_verificacion === 'rechazado').length,
    todas: agencias.length,
  };
}

/** Agencias de una cola, filtradas por nombre, RNT o ciudad. */
export function filtrarAgencias(
  agencias: Agency[],
  filtro: FiltroAgencias,
  busqueda: string,
  hoy = new Date(),
): Agency[] {
  const q = busqueda.trim().toLowerCase();
  return agencias
    .filter((a) => {
      switch (filtro) {
        case 'pendientes':
          return a.estado_verificacion === 'pendiente';
        case 'atencion':
          return requiereAtencion(a, hoy);
        case 'verificadas':
          return a.estado_verificacion === 'verificado';
        case 'rechazadas':
          return a.estado_verificacion === 'rechazado';
        default:
          return true;
      }
    })
    .filter(
      (a) =>
        !q ||
        a.nombre.toLowerCase().includes(q) ||
        a.numero_rnt.includes(q) ||
        a.ciudad.toLowerCase().includes(q),
    );
}

export type TonoAviso = 'alerta' | 'error' | 'info';

/**
 * Qué pasa con la verificación o el RNT de la agencia y qué tiene que hacer; null si está al día.
 * Fuente única: lo muestran el banner del panel y los avisos del Resumen.
 */
export function avisoVerificacion(a: Agency, hoy = new Date()): { tono: TonoAviso; texto: string } | null {
  if (a.estado_verificacion === 'rechazado') {
    return {
      tono: 'error',
      texto: `La verificación de tu agencia fue rechazada${a.motivo_rechazo ? `: ${a.motivo_rechazo}` : '.'} Corrige tus datos y escríbenos para revisarla de nuevo.`,
    };
  }
  if (a.estado_verificacion === 'pendiente') {
    return {
      tono: 'info',
      texto: `Tu agencia está en verificación (RNT ${a.numero_rnt}). Puedes preparar planes como borrador; se publicarán cuando el equipo Diverso confirme tu registro.`,
    };
  }
  const est = estadoVigencia(a, hoy);
  if (est === 'vencido') {
    return {
      tono: 'error',
      texto: 'El RNT de tu agencia está vencido: tus planes no se muestran ni reciben reservas. Renueva el registro y envíanos el soporte.',
    };
  }
  if (est === 'sin_vigencia') {
    return {
      tono: 'error',
      texto: 'Tu agencia no tiene registrada la vigencia del RNT, así que tus planes no se muestran. Envíanos el certificado vigente para habilitarla.',
    };
  }
  if (est === 'por_vencer') {
    const dias = diasParaVencer(a, hoy)!;
    return {
      tono: 'alerta',
      texto: `Tu RNT vence el ${fechaTexto(a.rnt_vigente_hasta!)} (en ${dias} ${dias === 1 ? 'día' : 'días'}). Renuévalo a tiempo para no dejar de vender.`,
    };
  }
  return null;
}

/** Texto y color de la vigencia del RNT en la tarjeta de cada agencia. */
export function textoVigencia(a: Agency, hoy = new Date()): { texto: string; clase: string } {
  const dias = diasParaVencer(a, hoy);
  switch (estadoVigencia(a, hoy)) {
    case 'vencido':
      return { texto: `RNT vencido hace ${Math.abs(dias!)} ${Math.abs(dias!) === 1 ? 'día' : 'días'}`, clase: 'text-red-600' };
    case 'por_vencer':
      return {
        texto: dias === 0 ? 'RNT vence hoy' : `RNT vence en ${dias} ${dias === 1 ? 'día' : 'días'}`,
        clase: 'text-orange-600',
      };
    case 'sin_vigencia':
      return { texto: 'Sin vigencia registrada', clase: 'text-slate-400' };
    default:
      return {
        texto: `RNT vigente hasta el ${fechaTexto(a.rnt_vigente_hasta!)}`,
        clase: 'text-ok-600 dark:text-ok-500',
      };
  }
}

/** Frase de estado bajo el saludo del Resumen. */
export function etiquetaEstadoAgencia(a: Agency | null, hoy = new Date()): string {
  if (!a) return '';
  if (a.estado_verificacion === 'rechazado') return 'Verificación rechazada';
  if (a.estado_verificacion === 'pendiente') return 'En verificación';
  const est = estadoVigencia(a, hoy);
  if (est === 'vencido' || est === 'sin_vigencia') return 'Verificada · RNT vencido';
  return `Verificada ✓ · RNT vigente hasta el ${fechaTexto(a.rnt_vigente_hasta!)}`;
}
