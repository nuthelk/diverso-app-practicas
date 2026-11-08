import { describe, expect, it } from 'vitest';
import {
  actividadDeRango,
  actividadPorDia,
  elegirDia,
  estadoCalendario,
  mesParaCalendario,
  moverFoco,
  nivelDeViajeros,
} from '$lib/features/resumen/model/calendario';
import { periodoDeDia, periodoDeRango, periodoDeSemana, periodoPredefinido } from '$lib/features/resumen/model/periodo';

const HOY = '2026-11-11';
const MIERCOLES = new Date(Date.UTC(2026, 10, 11, 17, 0, 0));

/** Jueves 5: dos salidas (5 + 7); lunes 9: una de 24; jueves 12: una de 12; domingo 1-nov: una sin reservas. */
const actividad = actividadPorDia([
  { fecha: '2026-11-05', reservados: 5 },
  { fecha: '2026-11-05', reservados: 7 },
  { fecha: '2026-11-09', reservados: 24 },
  { fecha: '2026-11-12', reservados: 12 },
  { fecha: '2026-11-01', reservados: 0 },
]);

describe('nivelDeViajeros', () => {
  it('3 niveles fijos: 1–9, 10–19 y 20 o más; sin viajeros no hay nivel', () => {
    expect([0, 1, 9, 10, 19, 20, 150].map(nivelDeViajeros)).toEqual([0, 1, 1, 2, 2, 3, 3]);
  });
});

describe('actividad por día', () => {
  it('suma las salidas y los viajeros de cada día; los días sin salidas no aparecen', () => {
    expect(actividad.get('2026-11-05')).toEqual({ salidas: 2, viajeros: 12 });
    expect(actividad.get('2026-11-09')).toEqual({ salidas: 1, viajeros: 24 });
    expect(actividad.get('2026-11-01')).toEqual({ salidas: 1, viajeros: 0 });
    expect(actividad.has('2026-11-06')).toBe(false);
  });

  it('actividadDeRango suma los días del rango, extremos incluidos', () => {
    expect(actividadDeRango(actividad, '2026-11-05', '2026-11-12')).toEqual({ salidas: 4, viajeros: 48 });
    expect(actividadDeRango(actividad, '2026-11-05', '2026-11-05')).toEqual({ salidas: 2, viajeros: 12 });
    expect(actividadDeRango(actividad, '2026-11-13', '2026-11-30')).toEqual({ salidas: 0, viajeros: 0 });
  });
});

describe('mesParaCalendario', () => {
  const mes = (seleccion = periodoPredefinido('mes', MIERCOLES)) => mesParaCalendario(actividad, '2026-11-17', MIERCOLES, seleccion);
  const dia = (iso: string, seleccion?: Parameters<typeof mes>[0]) =>
    mes(seleccion).semanas.flatMap((s) => s.dias).find((d) => d.fecha === iso)!;

  it('el título y las semanas de lunes a domingo que cubren el mes, con días de los meses vecinos', () => {
    const { titulo, semanas } = mes();
    expect(titulo).toBe('Noviembre de 2026');
    expect(semanas.map((s) => [s.lunes, s.domingo])).toEqual([
      ['2026-10-26', '2026-11-01'],
      ['2026-11-02', '2026-11-08'],
      ['2026-11-09', '2026-11-15'],
      ['2026-11-16', '2026-11-22'],
      ['2026-11-23', '2026-11-29'],
      ['2026-11-30', '2026-12-06'],
    ]);
    expect(semanas.every((s) => s.dias.length === 7)).toBe(true);
    expect(semanas[0].dias.map((d) => d.delMes)).toEqual([false, false, false, false, false, false, true]);
    expect(semanas[5].dias.map((d) => d.delMes)).toEqual([true, false, false, false, false, false, false]);
    expect(semanas[0].dias.map((d) => d.numero)).toEqual([26, 27, 28, 29, 30, 31, 1]);
  });

  it('un mes que empieza en lunes no abre con una semana de más', () => {
    const { semanas } = mesParaCalendario(actividad, '2026-06-10', MIERCOLES, periodoDeDia('2026-06-10'));
    expect(semanas[0].lunes).toBe('2026-06-01');
  });

  it('cada día dice sus salidas, sus viajeros y su nivel', () => {
    expect(dia('2026-11-05')).toMatchObject({ salidas: 2, viajeros: 12, nivel: 2 });
    expect(dia('2026-11-09')).toMatchObject({ salidas: 1, viajeros: 24, nivel: 3 });
    expect(dia('2026-11-01')).toMatchObject({ salidas: 1, viajeros: 0, nivel: 0 });
    expect(dia('2026-11-06')).toMatchObject({ salidas: 0, viajeros: 0, nivel: 0 });
  });

  it('marca el día de hoy y nada más', () => {
    const marcados = mes().semanas.flatMap((s) => s.dias).filter((d) => d.hoy);
    expect(marcados.map((d) => d.fecha)).toEqual([HOY]);
  });

  it('el total de la semana suma los siete días, también los de otro mes', () => {
    const { semanas } = mes();
    expect(semanas.map((s) => [s.salidas, s.viajeros])).toEqual([
      [1, 0], // 26-oct a 1-nov: la salida sin reservas del domingo
      [2, 12],
      [2, 36],
      [0, 0],
      [0, 0],
      [0, 0],
    ]);
  });

  it('el texto de cada día y de cada semana, para el lector de pantalla', () => {
    expect(dia('2026-11-05').etiqueta).toBe('Jueves 5 de noviembre: 2 salidas, 12 viajeros');
    expect(dia('2026-11-09').etiqueta).toBe('Lunes 9 de noviembre: 1 salida, 24 viajeros');
    expect(dia('2026-11-01').etiqueta).toBe('Domingo 1 de noviembre: 1 salida, 0 viajeros');
    expect(dia('2026-11-06').etiqueta).toBe('Viernes 6 de noviembre: sin salidas');
    expect(dia(HOY).etiqueta).toBe('Miércoles 11 de noviembre, hoy: sin salidas');
    const [primera, segunda, , cuarta] = mes().semanas;
    expect(primera.etiqueta).toBe('Semana del 26 de octubre al 1 de noviembre: 1 salida, 0 viajeros');
    expect(segunda.etiqueta).toBe('Semana del 2 al 8 de noviembre: 2 salidas, 12 viajeros');
    expect(cuarta.etiqueta).toBe('Semana del 16 al 22 de noviembre: sin salidas');
  });

  it('con un rango elegido marca los días de dentro y deja como extremos el primero y el último', () => {
    const rango = periodoDeRango('2026-11-05', '2026-11-07');
    expect(['2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08'].map((f) => [dia(f, rango).seleccionado, dia(f, rango).extremo])).toEqual([
      [false, false],
      [true, true],
      [true, false],
      [true, true],
      [false, false],
    ]);
  });

  it('un solo día elegido es extremo de sí mismo', () => {
    const uno = periodoDeDia('2026-11-05');
    expect(dia('2026-11-05', uno)).toMatchObject({ seleccionado: true, extremo: true });
    expect(dia('2026-11-06', uno)).toMatchObject({ seleccionado: false, extremo: false });
  });

  it('solo la semana elegida entera queda marcada como semana', () => {
    const semana = periodoDeSemana('2026-11-10');
    expect(mes(semana).semanas.map((s) => s.seleccionada)).toEqual([false, false, true, false, false, false]);
    // Un rango que casualmente cubre lunes a domingo no es «una semana» elegida… pero sí el mismo período.
    expect(mes(periodoDeDia('2026-11-10')).semanas.some((s) => s.seleccionada)).toBe(false);
    expect(mes(periodoPredefinido('mes', MIERCOLES)).semanas.some((s) => s.seleccionada)).toBe(false);
  });
});

describe('moverFoco', () => {
  it.each([
    ['ArrowRight', '2026-11-12'],
    ['ArrowLeft', '2026-11-10'],
    ['ArrowDown', '2026-11-18'],
    ['ArrowUp', '2026-11-04'],
    ['Home', '2026-11-09'],
    ['End', '2026-11-15'],
    ['PageDown', '2026-12-11'],
    ['PageUp', '2026-10-11'],
  ])('%s desde el miércoles 11 va a %s', (tecla, esperado) => {
    expect(moverFoco('2026-11-11', tecla)).toBe(esperado);
  });

  it('cruza de mes y de año con las flechas', () => {
    expect(moverFoco('2026-11-30', 'ArrowRight')).toBe('2026-12-01');
    expect(moverFoco('2026-11-01', 'ArrowLeft')).toBe('2026-10-31');
    expect(moverFoco('2026-12-31', 'ArrowRight')).toBe('2027-01-01');
  });

  it('Inicio y Fin son el lunes y el domingo de esa semana, aunque sea de otro mes', () => {
    expect(moverFoco('2026-11-01', 'Home')).toBe('2026-10-26');
    expect(moverFoco('2026-11-01', 'End')).toBe('2026-11-01');
  });

  it('PageUp y PageDown desde un 31 caen en el último día del otro mes', () => {
    expect(moverFoco('2026-01-31', 'PageDown')).toBe('2026-02-28');
    expect(moverFoco('2026-03-31', 'PageUp')).toBe('2026-02-28');
  });

  it('otras teclas no mueven nada', () => {
    expect(moverFoco('2026-11-11', 'Tab')).toBeNull();
    expect(moverFoco('2026-11-11', 'Enter')).toBeNull();
    expect(moverFoco('2026-11-11', 'a')).toBeNull();
  });
});

describe('elegirDia', () => {
  it('sin modo rango, un día es un período de un día', () => {
    expect(elegirDia(false, null, '2026-11-05')).toEqual({ periodo: periodoDeDia('2026-11-05'), ancla: null });
  });

  it('con modo rango, el primer día queda de ancla y el segundo cierra el rango', () => {
    expect(elegirDia(true, null, '2026-11-12')).toEqual({ periodo: null, ancla: '2026-11-12' });
    expect(elegirDia(true, '2026-11-12', '2026-11-05')).toEqual({ periodo: periodoDeRango('2026-11-05', '2026-11-12'), ancla: null });
  });

  it('con modo rango, tocar dos veces el mismo día es un día', () => {
    expect(elegirDia(true, '2026-11-05', '2026-11-05')).toEqual({ periodo: periodoDeDia('2026-11-05'), ancla: null });
  });
});

describe('estadoCalendario', () => {
  const p = periodoPredefinido('semana', MIERCOLES);

  it('sin nada especial: el período elegido y cuántas salidas y viajeros tiene', () => {
    expect(estadoCalendario({ modoRango: false, ancla: null, periodo: periodoDeRango('2026-11-05', '2026-11-12'), actividad, hoy: MIERCOLES })).toEqual({
      titulo: '5–12 nov',
      texto: '4 salidas · 48 viajeros',
    });
    expect(estadoCalendario({ modoRango: false, ancla: null, periodo: p, actividad, hoy: MIERCOLES })).toEqual({
      titulo: 'Esta semana · 9–15 nov',
      texto: '2 salidas · 36 viajeros',
    });
  });

  it('singular y ceros', () => {
    expect(estadoCalendario({ modoRango: false, ancla: null, periodo: periodoDeDia('2026-11-09'), actividad, hoy: MIERCOLES }).texto).toBe('1 salida · 24 viajeros');
    expect(estadoCalendario({ modoRango: false, ancla: null, periodo: periodoDeDia('2026-11-20'), actividad, hoy: MIERCOLES }).texto).toBe('0 salidas · 0 viajeros');
  });

  it('eligiendo un rango dice qué falta', () => {
    expect(estadoCalendario({ modoRango: true, ancla: null, periodo: p, actividad, hoy: MIERCOLES })).toEqual({
      titulo: null,
      texto: 'Elige el primer día del rango.',
    });
    expect(estadoCalendario({ modoRango: true, ancla: '2026-11-09', periodo: p, actividad, hoy: MIERCOLES })).toEqual({
      titulo: null,
      texto: 'Primer día: lun 9 nov. Elige el último día del rango.',
    });
  });
});
