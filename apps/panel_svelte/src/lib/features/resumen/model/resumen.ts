/** Lógica pura del Resumen de la agencia: avisos por resolver y las cifras del período (salidas, viajeros y plata). */

import { avisoVerificacion, type TonoAviso } from '$lib/features/agencias/model/verificacion';
import { lunesDeSemana, puedeEjecutarse, type Liquidacion } from '$lib/features/liquidaciones/model/liquidaciones';
import { diasParaVencer, estadoVigencia, type Agency } from '$lib/features/agencias/model/agencia';
import { fechaBogota, yaSalio, type Plan } from '$lib/features/planes/model/plan';
import { totalesVentas, ventasPagadas, type VentaRow } from '$lib/features/ventas/model/ventas';
import { cop, plural } from '$lib/shared/lib/format';
import { diaCorto, sumarDias } from './fechas';
import type { Periodo } from './periodo';
import type { Salida } from './salidas';

/**
 * Dónde se renueva el RNT: el Registro Nacional de Turismo es externo al panel (la verificación la registra el equipo
 * Diverso con el soporte que envía la agencia). Único lugar donde vive el enlace.
 */
export const URL_RENOVAR_RNT = 'https://rnt.rue.com.co/';

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

/* Cifras del período -------------------------------------------------- */

/** Lo que se dispersará: suma de las liquidaciones pendientes con saldo a favor, el próximo lunes (o hoy si es lunes). */
export function proximoPago(liquidaciones: Liquidacion[], hoy = new Date()): { fecha: string; monto: number } | null {
  const monto = liquidaciones.filter(puedeEjecutarse).reduce((s, l) => s + l.monto_a_pagar, 0);
  if (monto <= 0) return null;
  const hoyISO = fechaBogota(hoy);
  const lunes = lunesDeSemana(hoyISO);
  return { fecha: lunes === hoyISO ? hoyISO : sumarDias(lunes, 7), monto };
}

export interface CifrasPeriodo {
  salidas: number;
  yaSalieron: number;
  proximas: number;
  viajeros: number;
  cupos: number;
  /** 0–100, de los cupos de las salidas. */
  ocupacion: number;
  /** Personas con reserva sin pagar en los viajes del período. */
  pendientes: number;
  porCobrar: number;
  /** Lo pagado en los viajes del período. */
  vendido: number;
  comision: number;
  /** Lo que le corresponde a la agencia: lo vendido menos la comisión de Diverso. */
  aRecibir: number;
}

/**
 * Las cifras de un período: salidas, viajeros y ocupación salen de las `salidas` (las del período); la plata, de las
 * ventas de los viajes del período (la vista trae la fecha del viaje, no la de la compra).
 */
export function cifrasDelPeriodo(salidas: Salida[], ventas: VentaRow[], periodo: Pick<Periodo, 'desde' | 'hasta'>): CifrasPeriodo {
  const delPeriodo = ventas.filter((v) => v.fecha >= periodo.desde && v.fecha <= periodo.hasta);
  const pagado = totalesVentas(ventasPagadas(delPeriodo));
  const sinPagar = delPeriodo.filter((v) => v.booking_estado === 'pendiente_pago');
  const viajeros = salidas.reduce((s, x) => s + x.reservados, 0);
  const cupos = salidas.reduce((s, x) => s + x.total, 0);
  const yaSalieron = salidas.filter((s) => s.yaSalio).length;
  return {
    salidas: salidas.length,
    yaSalieron,
    proximas: salidas.length - yaSalieron,
    viajeros,
    cupos,
    ocupacion: cupos > 0 ? Math.round((viajeros / cupos) * 100) : 0,
    pendientes: sinPagar.reduce((s, v) => s + v.pax, 0),
    porCobrar: sinPagar.reduce((s, v) => s + v.monto_total, 0),
    vendido: pagado.total,
    comision: pagado.comision,
    aRecibir: pagado.saldo,
  };
}

export interface Kpi {
  clave: 'salidas' | 'viajeros' | 'pendientes' | 'corresponde';
  etiqueta: string;
  valor: string;
  /** Aclara el alcance de la cifra. */
  sub: string;
  tono: 'neutro' | 'alerta';
  /** La cifra de la plata, destacada sobre el monte oscuro. */
  principal: boolean;
}

/** Las cuatro cifras del período con su texto; el próximo pago no depende del período (`kpiProximoPago`). */
export function kpisDelPeriodo(c: CifrasPeriodo, comisionPct: number): Kpi[] {
  return [
    {
      clave: 'salidas',
      etiqueta: 'Salidas',
      valor: String(c.salidas),
      sub:
        c.salidas > 0
          ? `${c.yaSalieron} ya ${plural(c.yaSalieron, 'salió', 'salieron')} · ${c.proximas} ${plural(c.proximas, 'próxima', 'próximas')}`
          : 'Sin salidas en el período',
      tono: 'neutro',
      principal: false,
    },
    {
      clave: 'viajeros',
      etiqueta: 'Viajeros',
      valor: String(c.viajeros),
      sub: c.cupos > 0 ? `${c.ocupacion} % de ${c.cupos} cupos` : 'Sin cupos en el período',
      tono: 'neutro',
      principal: false,
    },
    {
      clave: 'pendientes',
      etiqueta: 'Pagos pendientes',
      valor: `${c.pendientes} ${plural(c.pendientes, 'persona', 'personas')}`,
      sub: c.pendientes > 0 ? `${cop(c.porCobrar)} por cobrar` : 'Todo pagado',
      tono: c.pendientes > 0 ? 'alerta' : 'neutro',
      principal: false,
    },
    {
      clave: 'corresponde',
      etiqueta: 'Te corresponde',
      valor: cop(c.aRecibir),
      sub: c.vendido > 0 ? `Vendido ${cop(c.vendido)} · comisión ${comisionPct} %` : 'Aún sin reservas pagadas',
      tono: 'neutro',
      principal: true,
    },
  ];
}

/** La quinta cifra: cuándo y cuánto se paga; una frase simple si no hay pagos o no se pudieron consultar. */
export function kpiProximoPago(
  pago: { fecha: string; monto: number } | null,
  consultado: boolean,
): { etiqueta: string; valor: string; sub: string } {
  const etiqueta = 'Próximo pago';
  if (!consultado) return { etiqueta, valor: '—', sub: 'No pudimos consultar tus pagos ahora.' };
  if (!pago) return { etiqueta, valor: 'Sin pagos', sub: 'No tienes pagos pendientes por ahora.' };
  return { etiqueta, valor: diaCorto(pago.fecha), sub: cop(pago.monto) };
}
