import { describe, expect, it } from 'vitest';
import {
  avisoVerificacion,
  conteosAgencias,
  etiquetaEstadoAgencia,
  filtrarAgencias,
  requiereAtencion,
  textoVigencia,
} from './agencias';
import { agencia, HOY } from '../test/fixtures';

const lista = [
  agencia({ id: 'v', nombre: 'Verde Vigente' }),
  agencia({
    id: 'p',
    nombre: 'Pendiente Plan',
    estado_verificacion: 'pendiente',
    rnt_vigente_hasta: null,
    numero_rnt: '555',
  }),
  agencia({ id: 'x', nombre: 'Por Vencer', rnt_vigente_hasta: '2026-11-04', ciudad: 'Jardín' }),
  agencia({ id: 'r', nombre: 'Rechazada Ltda', estado_verificacion: 'rechazado', rnt_vigente_hasta: null }),
  agencia({ id: 's', nombre: 'Sin Vigencia', rnt_vigente_hasta: null }),
  agencia({ id: 'o', nombre: 'Ya Vencida', rnt_vigente_hasta: '2026-10-20' }),
];

const ids = (a: typeof lista) => a.map((x) => x.id);

describe('requiereAtencion', () => {
  it('solo las verificadas con RNT no vigente', () => {
    expect(lista.filter((a) => requiereAtencion(a, HOY)).map((a) => a.id)).toEqual(['x', 's', 'o']);
  });
});

describe('conteosAgencias', () => {
  it('cuenta cada cola', () => {
    expect(conteosAgencias(lista, HOY)).toEqual({
      pendientes: 1,
      atencion: 3,
      verificadas: 4,
      rechazadas: 1,
      todas: 6,
    });
  });

  it('sin agencias todo es cero', () => {
    expect(conteosAgencias([], HOY)).toEqual({
      pendientes: 0,
      atencion: 0,
      verificadas: 0,
      rechazadas: 0,
      todas: 0,
    });
  });
});

describe('filtrarAgencias', () => {
  it.each([
    ['pendientes', ['p']],
    ['atencion', ['x', 's', 'o']],
    ['verificadas', ['v', 'x', 's', 'o']],
    ['rechazadas', ['r']],
    ['todas', ['v', 'p', 'x', 'r', 's', 'o']],
  ] as const)('cola %s', (filtro, esperado) => {
    expect(ids(filtrarAgencias(lista, filtro, '', HOY))).toEqual(esperado);
  });

  it('busca por nombre, RNT o ciudad sin distinguir mayúsculas ni espacios de borde', () => {
    expect(ids(filtrarAgencias(lista, 'todas', '  JARDÍN ', HOY))).toEqual(['x']);
    expect(ids(filtrarAgencias(lista, 'todas', '555', HOY))).toEqual(['p']);
    expect(ids(filtrarAgencias(lista, 'todas', 'rechazada', HOY))).toEqual(['r']);
    expect(ids(filtrarAgencias(lista, 'todas', 'zzz', HOY))).toEqual([]);
  });

  it('la búsqueda se combina con la cola', () => {
    expect(ids(filtrarAgencias(lista, 'pendientes', 'verde', HOY))).toEqual([]);
  });
});

describe('textoVigencia', () => {
  it('vencida: días en singular y plural', () => {
    expect(textoVigencia(agencia({ rnt_vigente_hasta: '2026-10-24' }), HOY)).toEqual({
      texto: 'RNT vencido hace 1 día',
      clase: 'text-red-600',
    });
    expect(textoVigencia(agencia({ rnt_vigente_hasta: '2026-10-20' }), HOY).texto).toBe(
      'RNT vencido hace 5 días',
    );
  });

  it('por vencer: hoy, 1 día y varios', () => {
    expect(textoVigencia(agencia({ rnt_vigente_hasta: '2026-10-25' }), HOY)).toEqual({
      texto: 'RNT vence hoy',
      clase: 'text-orange-600',
    });
    expect(textoVigencia(agencia({ rnt_vigente_hasta: '2026-10-26' }), HOY).texto).toBe(
      'RNT vence en 1 día',
    );
    expect(textoVigencia(agencia({ rnt_vigente_hasta: '2026-11-04' }), HOY).texto).toBe(
      'RNT vence en 10 días',
    );
  });

  it('sin vigencia registrada', () => {
    expect(textoVigencia(agencia({ rnt_vigente_hasta: null }), HOY)).toEqual({
      texto: 'Sin vigencia registrada',
      clase: 'text-slate-400',
    });
  });

  it('vigente: fecha en texto', () => {
    expect(textoVigencia(agencia({ rnt_vigente_hasta: '2027-03-31' }), HOY)).toEqual({
      texto: 'RNT vigente hasta el 31 de marzo de 2027',
      clase: 'text-ok-600 dark:text-ok-500',
    });
  });
});

describe('etiquetaEstadoAgencia', () => {
  it('sin agencia es vacía', () => {
    expect(etiquetaEstadoAgencia(null, HOY)).toBe('');
  });

  it.each([
    [{ estado_verificacion: 'rechazado' as const }, 'Verificación rechazada'],
    [{ estado_verificacion: 'pendiente' as const }, 'En verificación'],
    [{ rnt_vigente_hasta: '2026-01-01' }, 'Verificada · RNT vencido'],
    [{ rnt_vigente_hasta: null }, 'Verificada · RNT vencido'],
    [{ rnt_vigente_hasta: '2026-11-04' }, 'Verificada ✓ · RNT vigente hasta el 4 de noviembre de 2026'],
    [{}, 'Verificada ✓ · RNT vigente hasta el 31 de marzo de 2027'],
  ])('%j → %s', (parcial, esperado) => {
    expect(etiquetaEstadoAgencia(agencia(parcial), HOY)).toBe(esperado);
  });
});

describe('avisoVerificacion: qué pasa con la agencia y qué tiene que hacer', () => {
  it.each([
    [
      { estado_verificacion: 'rechazado' as const, motivo_rechazo: 'RNT ilegible' },
      'error',
      'La verificación de tu agencia fue rechazada: RNT ilegible Corrige tus datos y escríbenos para revisarla de nuevo.',
    ],
    [
      { estado_verificacion: 'pendiente' as const, numero_rnt: '12345' },
      'info',
      'Tu agencia está en verificación (RNT 12345). Puedes preparar planes como borrador; se publicarán cuando el equipo Diverso confirme tu registro.',
    ],
    [
      { rnt_vigente_hasta: '2026-10-20' },
      'error',
      'El RNT de tu agencia está vencido: tus planes no se muestran ni reciben reservas. Renueva el registro y envíanos el soporte.',
    ],
    [
      { rnt_vigente_hasta: null },
      'error',
      'Tu agencia no tiene registrada la vigencia del RNT, así que tus planes no se muestran. Envíanos el certificado vigente para habilitarla.',
    ],
    [
      { rnt_vigente_hasta: '2026-11-14' },
      'alerta',
      'Tu RNT vence el 14 de noviembre de 2026 (en 20 días). Renuévalo a tiempo para no dejar de vender.',
    ],
  ])('%j → %s', (parcial, tono, texto) => {
    expect(avisoVerificacion(agencia(parcial), HOY)).toEqual({ tono, texto });
  });

  it('verificada y con RNT vigente: sin aviso', () => {
    expect(avisoVerificacion(agencia(), HOY)).toBeNull();
  });
});
