/** Lógica pura del Resumen de la agencia: salidas por fecha, avisos, plata del mes y próximo pago. */

import { avisoVerificacion, type TonoAviso } from './agencias';
import { lunesDeSemana, puedeEjecutarse, type Liquidacion } from './liquidaciones';
import { estadoVigencia, type Agency, type Plan, type VentaRow } from './types';
import { totalesVentas, ventasPagadas } from './ventas';

/** Cuántas salidas se muestran en el Resumen; el resto está en Planes. */
export const SALIDAS_VISIBLES = 5;

const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESES_LARGOS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

const aFecha = (iso: string) => new Date(iso + 'T12:00:00');

function aISO(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${dia}`;
}

/** «uno» si n es 1; si no, «otros». */
export function plural(n: number, uno: string, otros: string): string {
  return n === 1 ? uno : otros;
}

/** «dom 1 nov». */
export function textoDia(iso: string): string {
  const d = aFecha(iso);
  return `${DIAS[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]}`;
}

/** «Hoy», «Mañana» o «Dom 1 nov». */
export function etiquetaDia(iso: string, hoy = new Date()): string {
  const hoyISO = aISO(hoy);
  if (iso === hoyISO) return 'Hoy';
  const manana = aFecha(hoyISO);
  manana.setDate(manana.getDate() + 1);
  if (iso === aISO(manana)) return 'Mañana';
  const t = textoDia(iso);
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/* Próximas salidas ------------------------------------------------------- */

/** llena: sin cupos; casi_llena: queda ≤ 20 %; vacia: nadie ha pagado; normal: el resto. */
export type NivelSalida = 'llena' | 'casi_llena' | 'vacia' | 'normal';

export interface SalidaProxima {
  fecha: string;
  titulo: string;
  /** Personas con reserva pagada (confirmada o completada) en esta fecha. */
  personas: number;
  libres: number;
  nivel: NivelSalida;
}

/**
 * Salidas de hoy en adelante, de la más próxima a la más lejana (las llenas también cuentan).
 * Las personas salen de las ventas pagadas por fecha y título del plan (la vista no trae el id del plan).
 * Un plan en borrador solo aparece si ya tiene reservas pagadas en esa fecha.
 */
export function proximasSalidasPorFecha(planes: Plan[], ventas: VentaRow[], hoy = new Date()): SalidaProxima[]  {
  const desde = aISO(hoy);
  const personasPor = new Map<string, number>();
  for (const v of ventasPagadas(ventas)) {
    const clave = `${v.fecha}|${v.plan_titulo}`;
    personasPor.set(clave, (personasPor.get(clave) ?? 0) + v.pax);
  }
  const salidas: SalidaProxima[] = [];
  for (const p of planes) {
    for (const d of p.plan_dates) {
      if (d.fecha < desde) continue;
      const personas = personasPor.get(`${d.fecha}|${p.titulo}`) ?? 0;
      if (p.estado !== 'publicado' && personas === 0) continue;
      const nivel: NivelSalida =
        d.cupo_disponible === 0
          ? 'llena'
          : d.cupo_total > 0 && d.cupo_disponible / d.cupo_total <= 0.2
            ? 'casi_llena'
            : personas === 0
              ? 'vacia'
              : 'normal';
      salidas.push({ fecha: d.fecha, titulo: p.titulo, personas, libres: d.cupo_disponible, nivel });
    }
  }
  return salidas.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.titulo.localeCompare(b.titulo));
}

/* Este mes -------------------------------------------------------------- */

export interface ResumenMes {
  mes: string;
  vendido: number;
  comision: number;
  aRecibir: number;
  reservas: number;
}

/** Primer día del mes en curso (yyyy-mm-dd): desde ahí se piden las ventas del Resumen. */
export function primerDiaDelMes(hoy = new Date()): string {
  return `${aISO(hoy).slice(0, 7)}-01`;
}

/** Lo pagado en los viajes del mes en curso (la vista trae la fecha del viaje, no la de la compra). */
export function resumenDelMes(ventas: VentaRow[], hoy = new Date()): ResumenMes {
  const prefijo = aISO(hoy).slice(0, 7);
  const delMes = ventasPagadas(ventas).filter((v) => v.fecha.startsWith(prefijo));
  const t = totalesVentas(delMes);
  return {
    mes: MESES_LARGOS[hoy.getMonth()],
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
  const hoyISO = aISO(hoy);
  const lunes = lunesDeSemana(hoyISO);
  if (lunes === hoyISO) return { fecha: hoyISO, monto };
  const siguiente = aFecha(lunes);
  siguiente.setDate(siguiente.getDate() + 7);
  return { fecha: aISO(siguiente), monto };
}

/* Avisos ---------------------------------------------------------------- */

export interface AvisoResumen {
  clave: 'verificacion' | 'rnt' | 'salidas' | 'cuenta';
  tono: TonoAviso;
  texto: string;
  /** Destino dentro del panel; sin él el aviso solo informa (p. ej. el RNT se renueva fuera del panel). */
  accion?: { texto: string; ruta: string };
}

/**
 * Lo accionable de la agencia, lo más urgente primero. `hayCuenta` es null si no se pudo consultar
 * (entonces no se avisa). Una agencia sin verificar solo ve el aviso de su verificación.
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
    return [{ clave: 'verificacion', ...verificacion! }];
  }
  if (agencia.estado_verificacion === 'pendiente') {
    return [{ clave: 'verificacion', ...verificacion!, accion: { texto: 'Crear un plan', ruta: '/planes/nuevo' } }];
  }

  const avisos: AvisoResumen[] = [];
  const vigencia = estadoVigencia(agencia, hoy);
  const sinRnt = vigencia === 'vencido' || vigencia === 'sin_vigencia';
  if (verificacion) avisos.push({ clave: 'rnt', ...verificacion });

  const desde = aISO(hoy);
  const haySalidas = planes.some((p) => p.estado === 'publicado' && p.plan_dates.some((d) => d.fecha >= desde));
  if (!sinRnt && !haySalidas) {
    avisos.push({
      clave: 'salidas',
      tono: 'alerta',
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
      texto: 'Aún no registras la cuenta donde recibirás tus pagos.',
      accion: { texto: 'Registrar cuenta', ruta: '/cuenta-dispersiones' },
    });
  }
  return avisos;
}
