import { describe, expect, it } from 'vitest';
import {
  esPeriodoInicial,
  PREDEFINIDOS,
  periodoDeDia,
  periodoDeRango,
  periodoDeSemana,
  periodoInicial,
  periodoPredefinido,
  textoChip,
  tituloPeriodo,
  viajesDe,
} from '$lib/features/resumen/model/periodo';
import { enZona } from '$tests/fixtures';

/** Miércoles 11-nov-2026, 12:00 en Bogotá. */
const MIERCOLES = new Date(Date.UTC(2026, 10, 11, 17, 0, 0));
const ZONAS = ['America/Bogota', 'Asia/Tokyo', 'Pacific/Kiritimati', 'America/Los_Angeles'];

describe('períodos predefinidos', () => {
  it('Hoy, Esta semana (lunes a domingo), Este mes y Próximos 30 días', () => {
    expect(periodoPredefinido('hoy', MIERCOLES)).toEqual({ clave: 'hoy', desde: '2026-11-11', hasta: '2026-11-11' });
    expect(periodoPredefinido('semana', MIERCOLES)).toEqual({ clave: 'semana', desde: '2026-11-09', hasta: '2026-11-15' });
    expect(periodoPredefinido('mes', MIERCOLES)).toEqual({ clave: 'mes', desde: '2026-11-01', hasta: '2026-11-30' });
    expect(periodoPredefinido('proximos30', MIERCOLES)).toEqual({ clave: 'proximos30', desde: '2026-11-11', hasta: '2026-12-10' });
  });

  it('el domingo todavía es de la semana que empezó el lunes anterior', () => {
    const domingo = new Date(Date.UTC(2026, 10, 15, 17, 0, 0));
    expect(periodoPredefinido('semana', domingo)).toMatchObject({ desde: '2026-11-09', hasta: '2026-11-15' });
  });

  it('el día es el de Bogotá, no el del navegador', () => {
    // 11-nov 22:00 en Bogotá = 12-nov 03:00 UTC: un navegador adelantado ya vería el 12.
    const noche = new Date(Date.UTC(2026, 10, 12, 3, 0, 0));
    for (const zona of ZONAS) {
      expect(enZona(zona, () => periodoPredefinido('hoy', noche)), zona).toMatchObject({ desde: '2026-11-11', hasta: '2026-11-11' });
      expect(enZona(zona, () => periodoPredefinido('mes', noche)), zona).toMatchObject({ desde: '2026-11-01', hasta: '2026-11-30' });
    }
  });

  it('los atajos, en orden, con el texto de los botones', () => {
    expect(PREDEFINIDOS.map((p) => [p.clave, p.texto])).toEqual([
      ['hoy', 'Hoy'],
      ['semana', 'Esta semana'],
      ['mes', 'Este mes'],
      ['proximos30', 'Próximos 30 días'],
    ]);
  });

  it('por defecto el Resumen muestra el mes en curso', () => {
    expect(periodoInicial(MIERCOLES)).toEqual({ clave: 'mes', desde: '2026-11-01', hasta: '2026-11-30' });
    expect(esPeriodoInicial(periodoPredefinido('mes', MIERCOLES))).toBe(true);
    expect(esPeriodoInicial(periodoPredefinido('hoy', MIERCOLES))).toBe(false);
    // Elegir a mano los mismos días es un filtro: el chip se puede quitar.
    expect(esPeriodoInicial(periodoDeRango('2026-11-01', '2026-11-30'))).toBe(false);
  });
});

describe('día, semana y rango elegidos en el calendario', () => {
  it('un día', () => {
    expect(periodoDeDia('2026-11-05')).toEqual({ clave: 'dia', desde: '2026-11-05', hasta: '2026-11-05' });
  });

  it('una semana se normaliza a lunes–domingo desde cualquiera de sus días', () => {
    const semana = { clave: 'sem', desde: '2026-11-09', hasta: '2026-11-15' };
    expect(periodoDeSemana('2026-11-09')).toEqual(semana);
    expect(periodoDeSemana('2026-11-12')).toEqual(semana);
    expect(periodoDeSemana('2026-11-15')).toEqual(semana);
  });

  it('una semana puede cruzar de mes', () => {
    expect(periodoDeSemana('2026-10-28')).toEqual({ clave: 'sem', desde: '2026-10-26', hasta: '2026-11-01' });
  });

  it('un rango se ordena aunque se elija el último día primero; el mismo día dos veces es un día', () => {
    expect(periodoDeRango('2026-11-12', '2026-11-05')).toEqual({ clave: 'rango', desde: '2026-11-05', hasta: '2026-11-12' });
    expect(periodoDeRango('2026-11-05', '2026-11-12')).toEqual({ clave: 'rango', desde: '2026-11-05', hasta: '2026-11-12' });
    expect(periodoDeRango('2026-11-05', '2026-11-05')).toEqual({ clave: 'dia', desde: '2026-11-05', hasta: '2026-11-05' });
  });
});

describe('textoChip', () => {
  const chip = (p: Parameters<typeof textoChip>[0]) => textoChip(p, MIERCOLES);

  it('los atajos llevan su nombre y el rango', () => {
    expect(chip(periodoPredefinido('hoy', MIERCOLES))).toBe('Hoy · mié 11 nov');
    expect(chip(periodoPredefinido('semana', MIERCOLES))).toBe('Esta semana · 9–15 nov');
    expect(chip(periodoPredefinido('mes', MIERCOLES))).toBe('Este mes · 1–30 nov');
    expect(chip(periodoPredefinido('proximos30', MIERCOLES))).toBe('Próximos 30 días · 11 nov – 10 dic');
  });

  it('un día, una semana elegida y un rango', () => {
    expect(chip(periodoDeDia('2026-11-05'))).toBe('jue 5 nov');
    expect(chip(periodoDeSemana('2026-11-04'))).toBe('Semana 2–8 nov');
    expect(chip(periodoDeRango('2026-11-05', '2026-11-12'))).toBe('5–12 nov');
    expect(chip(periodoDeRango('2026-10-28', '2026-11-03'))).toBe('28 oct – 3 nov');
  });

  it('fuera del año en curso añade el año para que no haya duda', () => {
    expect(chip(periodoDeDia('2027-01-04'))).toBe('lun 4 ene 2027');
    expect(chip(periodoDeRango('2027-01-04', '2027-01-10'))).toBe('4–10 ene 2027');
    expect(chip(periodoDeRango('2026-12-28', '2027-01-03'))).toBe('28 dic – 3 ene 2027');
  });
});

describe('el período dentro de una frase', () => {
  it('tituloPeriodo: el mes por su nombre; lo demás como rango', () => {
    expect(tituloPeriodo(periodoPredefinido('mes', MIERCOLES))).toBe('Noviembre de 2026');
    expect(tituloPeriodo(periodoDeSemana('2026-11-11'))).toBe('Del 9 al 15 de noviembre');
    expect(tituloPeriodo(periodoDeDia('2026-11-05'))).toBe('Jueves 5 de noviembre');
  });

  it('viajesDe: «No hay salidas …»', () => {
    expect(viajesDe(periodoPredefinido('mes', MIERCOLES))).toBe('de noviembre de 2026');
    expect(viajesDe(periodoDeDia('2026-11-05'))).toBe('del jueves 5 de noviembre');
    expect(viajesDe(periodoDeRango('2026-11-05', '2026-11-12'))).toBe('del 5 al 12 de noviembre');
  });
});
