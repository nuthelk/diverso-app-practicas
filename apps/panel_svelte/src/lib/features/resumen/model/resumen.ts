/** Lógica pura del Resumen de la agencia que no es de la agenda: encabezado, avisos por resolver y plata del mes. */

import { avisoVerificacion, type TonoAviso } from '$lib/features/agencias/model/verificacion';
import { lunesDeSemana, puedeEjecutarse, type Liquidacion } from '$lib/features/liquidaciones/model/liquidaciones';
import { diasParaVencer, estadoVigencia, type Agency } from '$lib/features/agencias/model/agencia';
import { fechaBogota, yaSalio, type Plan } from '$lib/features/planes/model/plan';
import { totalesVentas, ventasPagadas, type VentaRow } from '$lib/features/ventas/model/ventas';
import { cop } from '$lib/shared/lib/format';
import { diaCorto, fechaConAnio, MESES_LARGOS, sumarDias } from './fechas';

/**
 * Dónde se renueva el RNT: el Registro Nacional de Turismo es externo al panel (la verificación la registra el equipo
 * Diverso con el soporte que envía la agencia). Único lugar donde vive el enlace.
 */
export const URL_RENOVAR_RNT = 'https://rnt.rue.com.co/';

/* Encabezado ------------------------------------------------------------ */

/** La píldora (clave de `StatusPill`) y el texto que la acompaña bajo el saludo. */
export function estadoCabecera(a: Agency, hoy = new Date()): { estado: string; detalle: string } {
  if (a.estado_verificacion === 'rechazado') return { estado: 'rechazado', detalle: '' };
  if (a.estado_verificacion === 'pendiente') return { estado: 'en_verificacion', detalle: '' };
  const estado = estadoVigencia(a, hoy);
  if (!a.rnt_vigente_hasta) return { estado, detalle: '' };
  const fecha = fechaConAnio(a.rnt_vigente_hasta);
  return { estado, detalle: estado === 'vencido' ? `venció el ${fecha}` : `hasta el ${fecha}` };
}

/* Por resolver ---------------------------------------------------------- */

export interface AvisoResumen {
  clave: 'verificacion' | 'rnt' | 'salidas' | 'cuenta';
  tono: TonoAviso;
  /** Lo que se resuelve hoy: va primero y en el color de urgencia. */
  urgente: boolean;
  /** «Urgente · hoy» o «Pendiente»: sobre el texto. */
  etiqueta: string;
  texto: string;
  /** Una ruta del panel o, para lo que se hace fuera de él (renovar el RNT), una dirección externa. */
  accion?: { texto: string; ruta: string } | { texto: string; url: string };
}

/** «Urgente · hoy», «Urgente · mañana» o «Urgente · en 12 días»; sin plazo (vencido o sin vigencia) solo «Urgente». */
function etiquetaRnt(a: Agency, hoy: Date): string {
  const dias = estadoVigencia(a, hoy) === 'por_vencer' ? diasParaVencer(a, hoy) : null;
  if (dias === null) return 'Urgente';
  return dias <= 0 ? 'Urgente · hoy' : dias === 1 ? 'Urgente · mañana' : `Urgente · en ${dias} días`;
}

/**
 * Lo accionable de la agencia, lo urgente primero (el RNT vencido o por vencer, la verificación rechazada) y
 * después lo pendiente. `hayCuenta` es null si no se pudo consultar (entonces no se avisa). Una agencia sin
 * verificar solo ve el aviso de su verificación.
 */
export function avisosResumen(datos: {
  agencia: Agency;
  planes: Plan[];
  hayCuenta: boolean | null;
  hoy?: Date;
}): AvisoResumen[] {
  const { agencia, planes, hayCuenta, hoy = new Date() } = datos;

  // Verificación y RNT: el mismo texto del banner de las demás secciones (qué pasa y qué hacer).
  const verificacion = avisoVerificacion(agencia, hoy);
  if (agencia.estado_verificacion === 'rechazado') {
    return [{ clave: 'verificacion', ...verificacion!, urgente: true, etiqueta: 'Urgente' }];
  }
  if (agencia.estado_verificacion === 'pendiente') {
    return [
      {
        clave: 'verificacion',
        ...verificacion!,
        urgente: false,
        etiqueta: 'Pendiente',
        accion: { texto: 'Crear un plan', ruta: '/planes/nuevo' },
      },
    ];
  }

  const avisos: AvisoResumen[] = [];
  const vigencia = estadoVigencia(agencia, hoy);
  const sinRnt = vigencia === 'vencido' || vigencia === 'sin_vigencia';
  if (verificacion) {
    avisos.push({
      clave: 'rnt',
      ...verificacion,
      urgente: true,
      etiqueta: etiquetaRnt(agencia, hoy),
      accion: { texto: 'Renovar RNT', url: URL_RENOVAR_RNT },
    });
  }

  const haySalidas = planes.some((p) => p.estado === 'publicado' && p.plan_dates.some((d) => !yaSalio(p, d, hoy)));
  if (!sinRnt && !haySalidas) {
    avisos.push({
      clave: 'salidas',
      tono: 'alerta',
      urgente: false,
      etiqueta: 'Pendiente',
      texto: 'No tienes salidas próximas: nadie puede reservar con tu agencia.',
      accion:
        planes.length === 0
          ? { texto: 'Crear tu primer plan', ruta: '/planes/nuevo' }
          : { texto: 'Agregar fechas', ruta: '/planes' },
    });
  }
  if (hayCuenta === false) {
    avisos.push({
      clave: 'cuenta',
      tono: 'alerta',
      urgente: false,
      etiqueta: 'Pendiente',
      texto: 'Aún no registras la cuenta donde recibirás tus pagos.',
      accion: { texto: 'Registrar cuenta', ruta: '/cuenta-dispersiones' },
    });
  }
  // Estable: dentro de cada grupo se conserva el orden de arriba.
  return [...avisos.filter((a) => a.urgente), ...avisos.filter((a) => !a.urgente)];
}

/* Plata del mes --------------------------------------------------------- */

export interface ResumenMes {
  mes: string;
  vendido: number;
  comision: number;
  aRecibir: number;
  reservas: number;
}

/** Desde cuándo se piden las ventas del Resumen (yyyy-mm-dd, fecha del viaje): el primer día del mes de Bogotá. */
export function desdeResumen(hoy = new Date()): string {
  return `${fechaBogota(hoy).slice(0, 7)}-01`;
}

/** Lo pagado en los viajes del mes en curso en Bogotá (la vista trae la fecha del viaje, no la de la compra). */
export function resumenDelMes(ventas: VentaRow[], hoy = new Date()): ResumenMes {
  const prefijo = fechaBogota(hoy).slice(0, 7);
  const delMes = ventasPagadas(ventas).filter((v) => v.fecha.startsWith(prefijo));
  const t = totalesVentas(delMes);
  return {
    mes: MESES_LARGOS[Number(prefijo.slice(5)) - 1],
    vendido: t.total,
    comision: t.comision,
    aRecibir: t.saldo,
    reservas: delMes.length,
  };
}

/** Lo que se dispersará: suma de las liquidaciones pendientes con saldo a favor, el próximo lunes (o hoy si es lunes). */
export function proximoPago(liquidaciones: Liquidacion[], hoy = new Date()): { fecha: string; monto: number } | null {
  const monto = liquidaciones.filter(puedeEjecutarse).reduce((s, l) => s + l.monto_a_pagar, 0);
  if (monto <= 0) return null;
  const hoyISO = fechaBogota(hoy);
  const lunes = lunesDeSemana(hoyISO);
  return { fecha: lunes === hoyISO ? hoyISO : sumarDias(lunes, 7), monto };
}

export interface DineroDelMes {
  /** «$ 6.143.280»: lo que le corresponde a la agencia. */
  monto: string;
  /** «Vendiste $ 6.981.000 en noviembre · comisión del 12 % ($ 837.720)» o, sin ventas, por qué es cero. */
  desglose: string;
}

/** «Este mes te corresponde»: lo vendido menos la comisión que cobra Diverso a esta agencia (su `comision_pct`). */
export function dineroDelMes(ventas: VentaRow[], comisionPct: number, hoy = new Date()): DineroDelMes {
  const m = resumenDelMes(ventas, hoy);
  return {
    monto: cop(m.aRecibir),
    desglose:
      m.reservas > 0
        ? `Vendiste ${cop(m.vendido)} en ${m.mes} · comisión del ${comisionPct} % (${cop(m.comision)})`
        : `Todavía no hay reservas pagadas en los viajes de ${m.mes}.`,
  };
}

/** La línea del próximo pago: el texto y, si lo hay, el monto aparte (se pinta grande). */
export function lineaProximoPago(
  pago: { fecha: string; monto: number } | null,
  consultado: boolean,
): { texto: string; monto: string | null } {
  if (!consultado) return { texto: 'No pudimos consultar tus pagos ahora.', monto: null };
  if (!pago) return { texto: 'Próximo pago: no tienes pagos pendientes por ahora.', monto: null };
  return { texto: `Próximo pago: ${diaCorto(pago.fecha)} ·`, monto: cop(pago.monto) };
}
