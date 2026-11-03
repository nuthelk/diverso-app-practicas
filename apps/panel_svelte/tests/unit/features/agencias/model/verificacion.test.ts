import { describe, expect, it } from 'vitest';
import {
  avisoVerificacion,
  conteosAgencias,
  filtrarAgencias,
  requiereAtencion,
  textoVigencia,
} from '$lib/features/agencias/model/verificacion';
import { agencia, HOY } from '$tests/fixtures';

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
      clase: 'text-error-ink',
    });
    expect(textoVigencia(agencia({ rnt_vigente_hasta: '2026-10-20' }), HOY).texto).toBe(
      'RNT vencido hace 5 días',
    );
  });

  it('por vencer: hoy, 1 día y varios', () => {
    expect(textoVigencia(agencia({ rnt_vigente_hasta: '2026-10-25' }), HOY)).toEqual({
      texto: 'RNT vence hoy',
      clase: 'text-alert-ink',
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
      clase: 'text-suave',
    });
  });

  it('vigente: fecha en texto', () => {
    expect(textoVigencia(agencia({ rnt_vigente_hasta: '2027-03-31' }), HOY)).toEqual({
      texto: 'RNT vigente hasta el 31 de marzo de 2027',
      clase: 'text-ok-ink',
    });
  });
});
