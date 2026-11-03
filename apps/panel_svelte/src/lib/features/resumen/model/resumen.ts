/** Lógica pura del Resumen de la agencia: indicadores, salidas por día, plata del mes, próximo pago y avisos. */

import { avisoVerificacion, type TonoAviso } from '$lib/features/agencias/model/verificacion';
import { lunesDeSemana, puedeEjecutarse, type Liquidacion } from '$lib/features/liquidaciones/model/liquidaciones';
import { estadoVigencia, type Agency } from '$lib/features/agencias/model/agencia';
import { yaSalio, type Plan } from '$lib/features/planes/model/plan';
import { horaCorta } from '$lib/features/planes/model/politica';
import { type VentaRow } from '$lib/features/ventas/model/ventas';
import { totalesVentas, ventasPagadas } from '$lib/features/ventas/model/ventas';
import { cop, decimal1 } from '$lib/shared/lib/format';

/** Cuántas salidas se muestran en el Resumen; el resto está en Planes. */
export const SALIDAS_VISIBLES = 6;

/** Semanas (de lunes a domingo, la actual incluida) que cubren las series de los indicadores. */
const SEMANAS = 8;
/** Días con salidas que cubre la serie de «Personas por viajar». */
const DIAS_SERIE = 8;

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
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

/* Fechas en español ----------------------------------------------------- */

/** «Jueves 5 de noviembre» (o «Jueves 5 de nov» con mes corto). */
export function diaLargo(iso: string, mes: 'largo' | 'corto' = 'largo'): string {
  const d = aFecha(iso);
  const dia = DIAS[d.getDay()];
  const nombreMes = (mes === 'largo' ? MESES_LARGOS : MESES)[d.getMonth()];
  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)} ${d.getDate()} de ${nombreMes}`;
}

/** «31 mar 2027». */
export function fechaConAnio(iso: string): string {
  const d = aFecha(iso);
  return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
}

/** «Lunes 2 de noviembre»: la fecha de hoy bajo el saludo. */
export function fechaDeHoy(hoy = new Date()): string {
  return diaLargo(aISO(hoy));
}

/** «hoy», «mañana» o «en 3 días». */
export function relativoDia(iso: string, hoy = new Date()): string {
  const dias = Math.round((aFecha(iso).getTime() - aFecha(aISO(hoy)).getTime()) / 86_400_000);
  return dias === 0 ? 'hoy' : dias === 1 ? 'mañana' : `en ${dias} días`;
}

/* Sparkline ------------------------------------------------------------- */

/** Línea, área y último punto de una serie, en un lienzo de 80 × 40. */
export interface Sparkline {
  linea: string;
  area: string;
  /** Coordenadas del último punto (el círculo). */
  x: number;
  y: number;
}

const redondear = (n: number) => Math.round(n * 10) / 10;

/** null si la serie tiene menos de dos puntos o todo en cero: no hay tendencia que mostrar. */
export function sparkline(valores: number[]): Sparkline | null {
  if (valores.length < 2 || valores.every((v) => v === 0)) return null;
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const puntos = valores.map((v, i) => ({
    x: redondear(2 + (i * 76) / (valores.length - 1)),
    y: max === min ? 20 : redondear(35 - ((v - min) / (max - min)) * 30),
  }));
  const linea = 'M' + puntos.map((p) => `${p.x} ${p.y}`).join(' L');
  const primero = puntos[0];
  const ultimo = puntos[puntos.length - 1];
  return { linea, area: `${linea} L${ultimo.x} 40 L${primero.x} 40Z`, x: ultimo.x, y: ultimo.y };
}

/* Próximas salidas ------------------------------------------------------- */

/** llena: sin cupos; casi_llena: queda ≤ 20 %; vacia: nadie ha pagado; normal: el resto. */
export type NivelSalida = 'llena' | 'casi_llena' | 'vacia' | 'normal';

export interface SalidaProxima {
  fecha: string;
  /** HH:MM, la hora de salida del plan. */
  hora: string;
  titulo: string;
  /** Personas con reserva pagada (confirmada o completada) en esta fecha. */
  personas: number;
  libres: number;
  /** Cupo total de la fecha. */
  total: number;
  nivel: NivelSalida;
}

/**
 * Salidas que aún no parten (fecha + hora de salida en Bogotá, después de [hoy]), de la más próxima a la más
 * lejana; las llenas también cuentan.
 * Las personas salen de las ventas pagadas por fecha y título del plan (la vista no trae el id del plan).
 * Un plan en borrador solo aparece si ya tiene reservas pagadas en esa fecha.
 */
export function proximasSalidasPorFecha(planes: Plan[], ventas: VentaRow[], hoy = new Date()): SalidaProxima[]  {
  const personasPor = new Map<string, number>();
  for (const v of ventasPagadas(ventas)) {
    const clave = `${v.fecha}|${v.plan_titulo}`;
    personasPor.set(clave, (personasPor.get(clave) ?? 0) + v.pax);
  }
  const salidas: SalidaProxima[] = [];
  for (const p of planes) {
    for (const d of p.plan_dates) {
      if (yaSalio(p, d, hoy)) continue;
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
      salidas.push({
        fecha: d.fecha,
        hora: horaCorta(p.hora_salida),
        titulo: p.titulo,
        personas,
        libres: d.cupo_disponible,
        total: d.cupo_total,
        nivel,
      });
    }
  }
  return salidas.sort(
    (a, b) => a.fecha.localeCompare(b.fecha) || a.hora.localeCompare(b.hora) || a.titulo.localeCompare(b.titulo),
  );
}

export interface SalidaDia {
  hora: string;
  titulo: string;
  /** «3 personas · 21 cupos libres». */
  detalle: string;
  /** «3 de 24»: cupos tomados sobre el cupo total. */
  ocupacion: string;
  /** 0–100, para la barra. */
  porcentaje: number;
  nivel: NivelSalida;
}

export interface GrupoDia {
  fecha: string;
  /** «Jueves 5 de noviembre». */
  dia: string;
  /** «hoy», «mañana» o «en 3 días». */
  relativo: string;
  salidas: SalidaDia[];
}

/** Las salidas (ya ordenadas por fecha y hora) agrupadas por día, para la línea de tiempo. */
export function salidasPorDia(salidas: SalidaProxima[], hoy = new Date()): GrupoDia[] {
  const grupos: GrupoDia[] = [];
  for (const s of salidas) {
    let grupo = grupos[grupos.length - 1];
    if (!grupo || grupo.fecha !== s.fecha) {
      grupo = { fecha: s.fecha, dia: diaLargo(s.fecha), relativo: relativoDia(s.fecha, hoy), salidas: [] };
      grupos.push(grupo);
    }
    const tomados = Math.min(Math.max(s.total - s.libres, 0), s.total);
    grupo.salidas.push({
      hora: s.hora,
      titulo: s.titulo,
      detalle: `${s.personas} ${plural(s.personas, 'persona', 'personas')} · ${s.libres} ${plural(s.libres, 'cupo libre', 'cupos libres')}`,
      ocupacion: `${tomados} de ${s.total}`,
      porcentaje: s.total > 0 ? Math.round((tomados / s.total) * 1000) / 10 : 0,
      nivel: s.nivel,
    });
  }
  return grupos;
}

/* Este mes -------------------------------------------------------------- */

export interface ResumenMes {
  mes: string;
  vendido: number;
  comision: number;
  aRecibir: number;
  reservas: number;
}

/** Lo pagado en los viajes del mes de [fecha] (la vista trae la fecha del viaje, no la de la compra). */
function resumenDe(ventas: VentaRow[], fecha: Date): ResumenMes {
  const prefijo = aISO(fecha).slice(0, 7);
  const delMes = ventasPagadas(ventas).filter((v) => v.fecha.startsWith(prefijo));
  const t = totalesVentas(delMes);
  return {
    mes: MESES_LARGOS[fecha.getMonth()],
    vendido: t.total,
    comision: t.comision,
    aRecibir: t.saldo,
    reservas: delMes.length,
  };
}

/** Lunes de la primera semana de las series: hace SEMANAS - 1 semanas. */
function primerLunesDeSeries(hoy: Date): string {
  const d = aFecha(lunesDeSemana(aISO(hoy)));
  d.setDate(d.getDate() - 7 * (SEMANAS - 1));
  return aISO(d);
}

/**
 * Desde cuándo se piden las ventas del Resumen (yyyy-mm-dd, fecha del viaje): lo que quede más atrás
 * entre el primer día del mes anterior y el inicio de las series semanales.
 */
export function desdeResumen(hoy = new Date()): string {
  const mesAnterior = aISO(new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1));
  const series = primerLunesDeSeries(hoy);
  return mesAnterior < series ? mesAnterior : series;
}

/** Lo pagado en los viajes del mes en curso. */
export function resumenDelMes(ventas: VentaRow[], hoy = new Date()): ResumenMes {
  return resumenDe(ventas, hoy);
}

export interface ResumenMesAnterior {
  mes: string;
  reservas: number;
  vendido: number;
  /** «En octubre: 13 reservas por $ 3.750.000.» */
  texto: string;
}

export function resumenMesAnterior(ventas: VentaRow[], hoy = new Date()): ResumenMesAnterior {
  const m = resumenDe(ventas, new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1));
  return {
    mes: m.mes,
    reservas: m.reservas,
    vendido: m.vendido,
    texto:
      m.reservas > 0
        ? `En ${m.mes}: ${m.reservas} ${plural(m.reservas, 'reserva', 'reservas')} por ${cop(m.vendido)}.`
        : `En ${m.mes} no hubo reservas pagadas.`,
  };
}

/** Qué parte de lo vendido es de la agencia y cuál es comisión, en % (suman 100); null si no hay ventas. */
export function repartoMes(m: ResumenMes): { recibe: number; comision: number } | null {
  if (m.vendido <= 0) return null;
  const comision = Math.min(redondear((Math.max(m.comision, 0) / m.vendido) * 100), 100);
  return { recibe: redondear(100 - comision), comision };
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

/* Calificación ---------------------------------------------------------- */

/**
 * Promedio de los planes publicados ponderado por sus reseñas, con el total de reseñas y cuántos planes
 * las tienen; null si todavía no hay ninguna.
 */
export function calificacionPlanes(planes: Plan[]): { promedio: number; resenas: number; planes: number } | null {
  const conResenas = planes.filter((p) => p.estado === 'publicado' && p.reviews_count > 0);
  const resenas = conResenas.reduce((s, p) => s + p.reviews_count, 0);
  if (resenas === 0) return null;
  const suma = conResenas.reduce((s, p) => s + p.rating_promedio * p.reviews_count, 0);
  return { promedio: suma / resenas, resenas, planes: conResenas.length };
}

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

/* Indicadores ----------------------------------------------------------- */

export type ClaveKpi = 'corresponde' | 'personas' | 'pago' | 'calificacion';

export interface Kpi {
  clave: ClaveKpi;
  titulo: string;
  valor: string;
  nota: string;
  /** Solo de datos reales; null cuando no hay suficientes para una tendencia. */
  serie: Sparkline | null;
  /** Estrellas llenas (de 5) de la calificación; null en los demás indicadores o sin reseñas. */
  estrellas: number | null;
}

/** Lo que corresponde a la agencia por semana (lunes a domingo, fecha del viaje), de la más antigua a la actual. */
function saldoPorSemana(ventas: VentaRow[], hoy: Date): number[] {
  const porSemana = new Map<string, number>();
  for (const v of ventasPagadas(ventas)) {
    const lunes = lunesDeSemana(v.fecha);
    porSemana.set(lunes, (porSemana.get(lunes) ?? 0) + v.saldo_agencia);
  }
  const d = aFecha(primerLunesDeSeries(hoy));
  return Array.from({ length: SEMANAS }, () => {
    const suma = porSemana.get(aISO(d)) ?? 0;
    d.setDate(d.getDate() + 7);
    return suma;
  });
}

/** Personas por día con salidas, desde la próxima (las salidas vienen ordenadas por fecha). */
function personasPorDia(salidas: SalidaProxima[]): number[] {
  const porDia = new Map<string, number>();
  for (const s of salidas) porDia.set(s.fecha, (porDia.get(s.fecha) ?? 0) + s.personas);
  return [...porDia.values()].slice(0, DIAS_SERIE);
}

/** Montos de las últimas liquidaciones semanales que se pagaron o se pagarán, de la más antigua a la reciente. */
function pagosSemanales(liquidaciones: Liquidacion[]): number[] {
  return liquidaciones
    .filter((l) => l.tipo === 'semanal' && (l.estado === 'pendiente' || l.estado === 'pagada_prueba'))
    .sort((a, b) => a.periodo_inicio.localeCompare(b.periodo_inicio))
    .slice(-SEMANAS)
    .map((l) => l.monto_a_pagar);
}

/**
 * Los cuatro indicadores de arriba. `liquidaciones` es null si no se pudieron consultar.
 * «Te corresponde» y su serie vienen de las ventas pagadas por fecha del viaje; «Personas» de las
 * salidas próximas; «Próximo pago» de las liquidaciones; «Calificación» de los planes publicados.
 */
export function kpisResumen(datos: {
  planes: Plan[];
  salidas: SalidaProxima[];
  ventas: VentaRow[];
  liquidaciones: Liquidacion[] | null;
  hoy?: Date;
}): Kpi[] {
  const { planes, salidas, ventas, liquidaciones, hoy = new Date() } = datos;

  const mes = resumenDelMes(ventas, hoy);
  const corresponde: Kpi = {
    clave: 'corresponde',
    titulo: 'Te corresponde este mes',
    valor: cop(mes.aRecibir),
    nota:
      mes.reservas > 0 ? `de ${cop(mes.vendido)} vendidos en ${mes.mes}` : `Sin ventas pagadas en ${mes.mes}`,
    serie: sparkline(saldoPorSemana(ventas, hoy)),
    estrellas: null,
  };

  const personas = salidas.reduce((s, x) => s + x.personas, 0);
  const nota =
    salidas.length === 0
      ? 'No tienes salidas próximas'
      : personas === 0
        ? `Sin reservas pagadas en ${salidas.length} ${plural(salidas.length, 'salida', 'salidas')}`
        : salidas.length === 1
          ? 'en 1 salida'
          : `repartidas en ${salidas.length} salidas`;
  const porViajar: Kpi = {
    clave: 'personas',
    titulo: 'Personas por viajar',
    valor: String(personas),
    nota,
    serie: sparkline(personasPorDia(salidas)),
    estrellas: null,
  };

  const pago = liquidaciones ? proximoPago(liquidaciones, hoy) : null;
  const proximo: Kpi = {
    clave: 'pago',
    titulo: 'Próximo pago',
    valor: liquidaciones === null ? '—' : cop(pago?.monto ?? 0),
    nota:
      liquidaciones === null
        ? 'No pudimos consultarlo ahora'
        : pago
          ? `${diaLargo(pago.fecha, 'corto')} · liquidación semanal`
          : 'No tienes pagos pendientes por ahora',
    serie: liquidaciones ? sparkline(pagosSemanales(liquidaciones)) : null,
    estrellas: null,
  };

  const calificacion = calificacionPlanes(planes);
  const estrellas: Kpi = {
    clave: 'calificacion',
    titulo: 'Calificación de tus planes',
    valor: calificacion ? decimal1(calificacion.promedio) : '—',
    nota: calificacion
      ? `${calificacion.resenas} ${plural(calificacion.resenas, 'reseña', 'reseñas')} en ${calificacion.planes} ${plural(calificacion.planes, 'plan', 'planes')}`
      : 'Aún no tienes reseñas',
    serie: null,
    estrellas: calificacion ? Math.min(Math.max(Math.round(calificacion.promedio), 0), 5) : null,
  };

  return [corresponde, porViajar, proximo, estrellas];
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

  const haySalidas = planes.some((p) => p.estado === 'publicado' && p.plan_dates.some((d) => !yaSalio(p, d, hoy)));
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
