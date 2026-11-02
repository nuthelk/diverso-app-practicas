import { describe, expect, it } from 'vitest';
import {
  agregarFoto,
  agregarIncluye,
  CATEGORIAS,
  draftDesdePlan,
  draftToRow,
  draftVacio,
  fechasFuturas,
} from './plan';
import { fecha, HOY, plan } from '$tests/fixtures';

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

describe('draftDesdePlan', () => {
  it('traduce la fila del plan al borrador del formulario', () => {
    const p = {
      ...plan('Guatapé', []),
      id: 'p-1',
      categoria: 'cultura',
      precio_cop: 165000,
      duracion_texto: '2 días',
      punto_encuentro: 'Parque',
      incluye: ['Guía'],
      itinerario: [{ hora: '07:00', actividad: 'Salida' }],
      politica_notas: null as unknown as string,
      horas_reembolso_parcial: 24,
      porcentaje_reembolso_parcial: 50,
      hora_salida: '07:30:00',
      fotos: ['https://x.co/a.jpg'],
    };
    expect(draftDesdePlan(p)).toEqual({
      id: 'p-1',
      titulo: 'Guatapé',
      destino: 'Antioquia',
      categoria: 'cultura',
      precioCop: 165000,
      resumen: '',
      descripcion: '',
      duracionTexto: '2 días',
      puntoEncuentro: 'Parque',
      incluye: ['Guía'],
      incluyeTransporte: true,
      incluyeComida: false,
      incluyeHospedaje: false,
      itinerario: [{ hora: '07:00', actividad: 'Salida' }],
      politicaCancelacion: '',
      politicaNotas: '',
      horasCancelacionGratuita: 48,
      horasReembolsoParcial: 24,
      porcentajeReembolsoParcial: 50,
      horaSalida: '07:30',
      fotos: ['https://x.co/a.jpg'],
    });
  });

  it('copia las listas: editar el borrador no toca el plan', () => {
    const p = { ...plan('Guatapé', []), incluye: ['Guía'], itinerario: [{ hora: '07:00', actividad: 'Salida' }], fotos: ['https://x.co/a.jpg'] };
    const d = draftDesdePlan(p);
    d.incluye.push('Almuerzo');
    d.itinerario[0].actividad = 'Otra';
    d.fotos.push('https://x.co/b.jpg');
    expect(p.incluye).toEqual(['Guía']);
    expect(p.itinerario[0].actividad).toBe('Salida');
    expect(p.fotos).toEqual(['https://x.co/a.jpg']);
  });
});

describe('agregarIncluye', () => {
  it('agrega el ítem sin espacios sobrantes', () => {
    expect(agregarIncluye(['Guía'], '  Almuerzo ')).toEqual(['Guía', 'Almuerzo']);
  });

  it.each(['', '   ', 'Guía'])('rechaza «%s» (vacío o repetido): devuelve null', (texto) => {
    expect(agregarIncluye(['Guía'], texto)).toBeNull();
  });
});

describe('agregarFoto', () => {
  it('agrega la URL sin espacios sobrantes', () => {
    expect(agregarFoto([], ' https://x.co/a.jpg ')).toEqual(['https://x.co/a.jpg']);
  });

  it.each(['', 'ftp://x.co/a.jpg', 'x.co/a.jpg', 'https://x.co/a.jpg'])(
    'rechaza «%s» (no es http o está repetida): devuelve null',
    (url) => {
      expect(agregarFoto(['https://x.co/a.jpg'], url)).toBeNull();
    },
  );
});
