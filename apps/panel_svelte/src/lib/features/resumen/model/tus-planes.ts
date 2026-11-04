/** «Tus planes»: cuántas personas y qué ocupación tienen las salidas próximas de este mes, y cuál vende más o menos. */

import { fechaBogota, yaSalio, type Plan } from '$lib/features/planes/model/plan';
import { plural, unirNombres } from '$lib/shared/lib/format';

export interface PlanVendido {
  id: string;
  titulo: string;
  personas: number;
  salidas: number;
  /** 0–100, de los cupos de esas salidas. */
  ocupacion: number;
  /** 0–100, para la barra: relativo al plan con más personas. */
  ancho: number;
  etiqueta: 'mas' | 'menos' | null;
}

export interface TusPlanes {
  planes: PlanVendido[];
  /** Una frase en simple: quién vende más y quién menos, o lo que haya. */
  frase: string;
}

/**
 * Por plan publicado: personas reservadas y ocupación de sus salidas de este mes (Bogotá) que aún no parten.
 * Los más y menos vendidos solo se marcan entre planes con salidas este mes, si son dos o más y no van igual:
 * se ordena por personas y, si empatan, por ocupación; los empatados con el primero (o el último) comparten etiqueta.
 */
export function tusPlanes(planes: Plan[], hoy = new Date()): TusPlanes {
  const mes = fechaBogota(hoy).slice(0, 7);
  const medidos = planes
    .filter((p) => p.estado === 'publicado')
    .map((p) => {
      const salidas = p.plan_dates.filter((d) => d.fecha.startsWith(mes) && !yaSalio(p, d, hoy));
      const cupos = salidas.reduce((s, d) => s + Math.max(d.cupo_total, 0), 0);
      const personas = salidas.reduce((s, d) => s + Math.min(Math.max(d.cupo_total - d.cupo_disponible, 0), d.cupo_total), 0);
      return { id: p.id, titulo: p.titulo, personas, salidas: salidas.length, ocupacion: cupos > 0 ? Math.round((personas / cupos) * 100) : 0 };
    })
    .sort((a, b) => b.personas - a.personas || b.ocupacion - a.ocupacion || a.titulo.localeCompare(b.titulo));

  const activos = medidos.filter((p) => p.salidas > 0);
  const primero = activos[0];
  const ultimo = activos.at(-1);
  const igual = (a: (typeof medidos)[number], b: (typeof medidos)[number]) => a.personas === b.personas && a.ocupacion === b.ocupacion;
  const hayComparacion = activos.length >= 2 && !igual(primero, ultimo!);
  const maximo = primero?.personas ?? 0;

  const lista: PlanVendido[] = medidos.map((p) => ({
    ...p,
    ancho: maximo > 0 ? Math.round((p.personas / maximo) * 100) : 0,
    etiqueta: !hayComparacion || p.salidas === 0 ? null : igual(p, primero) ? 'mas' : igual(p, ultimo!) ? 'menos' : null,
  }));

  return { planes: lista, frase: frase(lista, activos.length, hayComparacion) };
}

function frase(lista: PlanVendido[], activos: number, hayComparacion: boolean): string {
  if (lista.length === 0) return 'Aún no tienes planes publicados.';
  if (activos === 0) return 'Este mes no tienes salidas próximas.';
  if (hayComparacion) {
    const mas = lista.filter((p) => p.etiqueta === 'mas').map((p) => p.titulo);
    const menos = lista.filter((p) => p.etiqueta === 'menos').map((p) => p.titulo);
    return `Este mes ${mas.length > 1 ? 'se venden' : 'se vende'} más ${unirNombres(mas)}; ${unirNombres(menos)} ${menos.length > 1 ? 'venden' : 'vende'} menos.`;
  }
  const conSalidas = lista.filter((p) => p.salidas > 0);
  if (conSalidas.length === 1) {
    const { personas, salidas } = conSalidas[0];
    return `Este mes tienes ${personas} ${plural(personas, 'persona reservada', 'personas reservadas')} en ${salidas} ${plural(salidas, 'salida', 'salidas')}.`;
  }
  return `Este mes tus planes van parejos: ${conSalidas[0].personas} ${plural(conSalidas[0].personas, 'persona', 'personas')} cada uno.`;
}
