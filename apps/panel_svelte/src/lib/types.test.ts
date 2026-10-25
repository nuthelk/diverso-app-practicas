import { describe, expect, it } from 'vitest';
import {
  CATEGORIAS,
  diasParaVencer,
  draftToRow,
  draftVacio,
  estadoVigencia,
  fechasFuturas,
  vigenciaSugerida,
} from './types';
import { fecha, HOY, plan } from '../test/fixtures';

describe('estadoVigencia', () => {
  it.each([
    [null, 'sin_vigencia'],
    ['2026-10-24', 'vencido'],
    ['2026-10-25', 'por_vencer'], // vence hoy: todavía sirve
    ['2026-11-24', 'por_vencer'], // 30 días: el límite
    ['2026-11-25', 'vigente'], // 31 días
    ['2027-03-31', 'vigente'],
  ])('rnt_vigente_hasta %s → %s', (hasta, esperado) => {
    expect(estadoVigencia({ rnt_vigente_hasta: hasta }, HOY)).toBe(esperado);
  });

  it('no depende de la hora del día', () => {
    expect(estadoVigencia({ rnt_vigente_hasta: '2026-10-25' }, new Date(2026, 9, 25, 23, 59))).toBe('por_vencer');
  });
});

describe('diasParaVencer', () => {
  it('cuenta días enteros, negativos si ya venció', () => {
    expect(diasParaVencer({ rnt_vigente_hasta: '2026-11-04' }, HOY)).toBe(10);
    expect(diasParaVencer({ rnt_vigente_hasta: '2026-10-25' }, HOY)).toBe(0);
    expect(diasParaVencer({ rnt_vigente_hasta: '2026-10-20' }, HOY)).toBe(-5);
  });

  it('sin vigencia devuelve null', () => {
    expect(diasParaVencer({ rnt_vigente_hasta: null }, HOY)).toBeNull();
  });
});

describe('vigenciaSugerida', () => {
  it('es el 31 de marzo del año siguiente', () => {
    expect(vigenciaSugerida(HOY)).toBe('2027-03-31');
    expect(vigenciaSugerida(new Date(2027, 0, 2))).toBe('2028-03-31');
  });
});

describe('fechasFuturas', () => {
  const p = plan('Guatapé', [
    fecha({ fecha: '2026-11-10', cupo_disponible: 3 }),
    fecha({ fecha: '2026-10-24', cupo_disponible: 5 }), // ayer
    fecha({ fecha: '2026-10-25', cupo_disponible: 4 }), // hoy cuenta
    fecha({ fecha: '2026-10-30', cupo_disponible: 0 }), // sin cupos
    fecha({ fecha: '2026-10-28', cupo_disponible: 1 }),
  ]);

  it('filtra pasadas y sin cupo, y ordena por fecha', () => {
    expect(fechasFuturas(p, HOY).map((d) => d.fecha)).toEqual(['2026-10-25', '2026-10-28', '2026-11-10']);
  });
});

describe('draftVacio', () => {
  it('arranca con los valores por defecto del formulario', () => {
    expect(draftVacio()).toMatchObject({
      id: null,
      titulo: '',
      categoria: 'aventura',
      precioCop: 0,
      duracionTexto: '1 día',
      incluyeTransporte: true,
      incluyeComida: false,
      incluyeHospedaje: false,
      incluye: [],
      itinerario: [],
      fotos: [],
    });
  });

  it('cada llamada devuelve arreglos independientes', () => {
    const a = draftVacio();
    a.incluye.push('Guía');
    expect(draftVacio().incluye).toEqual([]);
  });
});

describe('draftToRow', () => {
  const horas = (duracionTexto: string) => draftToRow({ ...draftVacio(), duracionTexto }).duracion_horas;

  it('traduce el borrador a columnas snake_case', () => {
    const row = draftToRow({
      ...draftVacio(),
      titulo: 'Guatapé',
      destino: 'Guatapé',
      precioCop: 165000,
      puntoEncuentro: 'Parque',
      politicaCancelacion: 'Cancelación gratis hasta 48 horas antes.',
    });
    expect(row).toMatchObject({
      titulo: 'Guatapé',
      precio_cop: 165000,
      punto_encuentro: 'Parque',
      politica_cancelacion: 'Cancelación gratis hasta 48 horas antes.',
      duracion_texto: '1 día',
      duracion_horas: 12,
      incluye_transporte: true,
    });
  });

  it.each([
    ['1 día', 12],
    ['2 días / 1 noche', 40],
    ['3 días', 36],
    ['4 horas', 4],
    ['2,5 horas', 2.5],
    ['90 minutos', 1.5],
    ['Medio día', 12],
    ['Todo el día', 12],
    ['Horas', 4],
    ['Minutos', 0.5],
  ])('duración «%s» → %s h', (texto, esperado) => {
    expect(horas(texto)).toBe(esperado);
  });
});

describe('CATEGORIAS', () => {
  it('tiene las seis categorías con etiqueta y emoji', () => {
    expect(CATEGORIAS.map((c) => c.valor)).toEqual([
      'aventura',
      'naturaleza',
      'cultura',
      'gastronomia',
      'relax',
      'urbano',
    ]);
    for (const c of CATEGORIAS) {
      expect(c.label).not.toBe('');
      expect(c.emoji).not.toBe('');
    }
  });
});
