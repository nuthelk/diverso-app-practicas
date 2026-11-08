import { describe, expect, it } from 'vitest';
import { finDeMes, inicioDeMes, rangoCorto, rangoLargo, sumarMeses } from '$lib/features/resumen/model/fechas';
import { enZona } from '$tests/fixtures';

const ZONAS = ['America/Bogota', 'Asia/Tokyo', 'Pacific/Kiritimati', 'America/Los_Angeles'];

describe('meses', () => {
  it('inicioDeMes y finDeMes: el primer y el último día, con febrero y bisiesto', () => {
    expect(inicioDeMes('2026-11-17')).toBe('2026-11-01');
    expect(finDeMes('2026-11-17')).toBe('2026-11-30');
    expect(finDeMes('2026-12-05')).toBe('2026-12-31');
    expect(finDeMes('2026-02-10')).toBe('2026-02-28');
    expect(finDeMes('2028-02-10')).toBe('2028-02-29');
  });

  it('sumarMeses conserva el día o cae en el último del mes, y cruza de año', () => {
    expect(sumarMeses('2026-03-15', -1)).toBe('2026-02-15');
    expect(sumarMeses('2026-01-31', 1)).toBe('2026-02-28');
    expect(sumarMeses('2026-12-10', 1)).toBe('2027-01-10');
    expect(sumarMeses('2027-01-10', -1)).toBe('2026-12-10');
  });

  it('no dependen de la zona horaria del navegador', () => {
    for (const zona of ZONAS) {
      expect(enZona(zona, () => finDeMes('2026-10-31')), zona).toBe('2026-10-31');
      expect(enZona(zona, () => sumarMeses('2026-10-31', 1)), zona).toBe('2026-11-30');
      expect(enZona(zona, () => inicioDeMes('2026-11-01')), zona).toBe('2026-11-01');
    }
  });
});

describe('rangos en texto', () => {
  it('rangoCorto: un día, dentro de un mes o entre dos meses', () => {
    expect(rangoCorto('2026-11-09', '2026-11-09')).toBe('lun 9 nov');
    expect(rangoCorto('2026-11-05', '2026-11-11')).toBe('5–11 nov');
    expect(rangoCorto('2026-10-28', '2026-11-03')).toBe('28 oct – 3 nov');
  });

  it('rangoLargo: un solo día se escribe completo; si no, como rangoTexto', () => {
    expect(rangoLargo('2026-11-05', '2026-11-05')).toBe('Jueves 5 de noviembre');
    expect(rangoLargo('2026-11-05', '2026-11-11')).toBe('Del 5 al 11 de noviembre');
    expect(rangoLargo('2026-10-26', '2026-11-01')).toBe('Del 26 de octubre al 1 de noviembre');
  });
});
