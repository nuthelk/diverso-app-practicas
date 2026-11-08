import { describe, expect, it } from 'vitest';
import {
  agregarFoto,
  agregarIncluye,
  CATEGORIAS,
  draftDesdePlan,
  draftToRow,
  draftVacio,
  errorPrecio,
  etiquetaCategoria,
  fechasFuturas,
  resumenPlanes,
  salidaDe,
  yaSalio,
} from '$lib/features/planes/model/plan';
import { enZona, fecha, HOY, plan } from '$tests/fixtures';

describe('salidaDe / yaSalio (hora de Bogotá, UTC−5 fijo)', () => {
  const p = (hora: string) => ({ ...plan('Guatapé', []), hora_salida: hora });
  const f = fecha({ fecha: '2026-11-02' });
  // 21:00 en Bogotá del 2-nov = 02:00 UTC del 3-nov: un navegador adelantado ya ve el 3-nov.
  const ahora = new Date(Date.UTC(2026, 10, 3, 2, 0, 0));

  it('la salida es fecha + hora_salida en Bogotá, expresada como instante UTC', () => {
    expect(salidaDe(p('09:00:00'), f).toISOString()).toBe('2026-11-02T14:00:00.000Z');
    expect(salidaDe(p('22:30:00'), f).toISOString()).toBe('2026-11-03T03:30:00.000Z');
  });

  it('una salida de las 09:00 ya salió a las 21:00; la de las 22:00 todavía no', () => {
    expect(yaSalio(p('09:00:00'), f, ahora)).toBe(true);
    expect(yaSalio(p('22:00:00'), f, ahora)).toBe(false);
  });

  it('justo a la hora exacta ya salió; un minuto antes no (misma regla que el servidor y el viajero)', () => {
    const exacta = new Date(Date.UTC(2026, 10, 2, 14, 0, 0));
    expect(yaSalio(p('09:00:00'), f, exacta)).toBe(true);
    expect(yaSalio(p('09:00:00'), f, new Date(exacta.getTime() - 60_000))).toBe(false);
  });

  it('las fechas de mañana en adelante no han salido', () => {
    expect(yaSalio(p('00:00:00'), fecha({ fecha: '2026-11-03' }), ahora)).toBe(false);
  });
});

describe('fechasFuturas', () => {
  const p = plan('Guatapé', [
    fecha({ fecha: '2026-11-10', cupo_disponible: 3 }),
    fecha({ fecha: '2026-10-24', cupo_disponible: 5 }), // ayer
    fecha({ fecha: '2026-10-25', cupo_disponible: 4 }), // hoy
    fecha({ fecha: '2026-10-30', cupo_disponible: 0 }), // sin cupos
    fecha({ fecha: '2026-10-28', cupo_disponible: 1 }),
  ]);
  const fechas = (ahora: Date) => fechasFuturas(p, ahora).map((d) => d.fecha);
  // La salida de los planes de prueba es a las 06:00 de Bogotá.
  const MADRUGADA = new Date(Date.UTC(2026, 9, 25, 10, 0, 0)); // 05:00 en Bogotá del 25-oct
  const MEDIODIA = new Date(Date.UTC(2026, 9, 25, 17, 0, 0)); // 12:00 en Bogotá del 25-oct

  it('filtra pasadas y sin cupo, y ordena por fecha', () => {
    expect(fechas(MADRUGADA)).toEqual(['2026-10-25', '2026-10-28', '2026-11-10']);
  });

  it('la salida de hoy cuenta mientras no haya partido y deja de contar al partir (06:00 en Bogotá)', () => {
    expect(fechas(new Date(MADRUGADA.getTime() + 59 * 60_000))).toContain('2026-10-25'); // 05:59
    expect(fechas(new Date(Date.UTC(2026, 9, 25, 11, 0, 0)))).not.toContain('2026-10-25'); // 06:00 justo
    expect(fechas(MEDIODIA)).toEqual(['2026-10-28', '2026-11-10']);
  });

  it('no depende de la zona horaria del navegador', () => {
    for (const zona of ['America/Bogota', 'Asia/Tokyo', 'Pacific/Kiritimati', 'America/Los_Angeles']) {
      expect(enZona(zona, () => fechas(MEDIODIA)), zona).toEqual(['2026-10-28', '2026-11-10']);
      expect(enZona(zona, () => fechas(MADRUGADA)), zona).toEqual(['2026-10-25', '2026-10-28', '2026-11-10']);
    }
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

describe('resumenPlanes (línea de contexto de «Planes»)', () => {
  const conEstado = (estado: 'publicado' | 'borrador') => ({ ...plan('X', []), estado });

  it('cuenta los planes y cuántos están publicados', () => {
    const planes = [conEstado('publicado'), conEstado('borrador'), conEstado('publicado')];
    expect(resumenPlanes(planes)).toBe('3 planes · 2 publicados');
  });

  it('singular con uno, plural con cero', () => {
    expect(resumenPlanes([conEstado('publicado')])).toBe('1 plan · 1 publicado');
    expect(resumenPlanes([conEstado('borrador'), conEstado('borrador')])).toBe('2 planes · 0 publicados');
  });
});

describe('etiquetaCategoria (la categoría como texto, sin emoji)', () => {
  it.each(CATEGORIAS.map((c) => [c.valor, c.label]))('«%s» se muestra como «%s»', (valor, label) => {
    expect(etiquetaCategoria(valor)).toBe(label);
  });

  it('un valor que no está en la lista se muestra tal cual', () => {
    expect(etiquetaCategoria('buceo')).toBe('buceo');
  });
});

describe('errorPrecio', () => {
  it('un precio mayor a 0 no tiene error', () => {
    expect(errorPrecio(150000)).toBeUndefined();
  });

  it.each([0, -5, null, undefined, NaN])('%s no es un precio válido', (v) => {
    expect(errorPrecio(v as number)).toBe('El precio debe ser mayor a 0.');
  });
});
