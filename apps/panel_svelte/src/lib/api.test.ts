import { beforeEach, describe, expect, it, vi } from 'vitest';
import { draftVacio } from './types';
import type { CuentaDispersion } from './liquidaciones';

/** Registro de lo que el panel le manda a Supabase (sin red). */
const rec = vi.hoisted(() => ({
  insert: null as unknown,
  update: null as unknown,
  upsert: null as unknown,
  upsertOpciones: null as unknown,
  select: '' as string,
  eq: [] as [string, unknown][],
  tabla: '',
  rpc: [] as [string, unknown][],
  respuestaRpc: { data: null as unknown, error: null as unknown },
}));

vi.mock('./supabase', () => {
  const cadena: Record<string, unknown> = {};
  const resultado = () => Promise.resolve({ data: { id: 'plan-1' }, error: null });
  cadena.insert = (fila: unknown) => {
    rec.insert = fila;
    return { select: () => ({ single: resultado }) };
  };
  cadena.update = (fila: unknown) => {
    rec.update = fila;
    return {
      eq: (col: string, val: unknown) => {
        rec.eq.push([col, val]);
        return Promise.resolve({ error: null });
      },
    };
  };
  cadena.select = (columnas: string) => {
    rec.select = columnas;
    return { eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) };
  };
  cadena.upsert = (fila: unknown, opciones: unknown) => {
    rec.upsert = fila;
    rec.upsertOpciones = opciones;
    return Promise.resolve({ error: null });
  };
  return {
    supabase: {
      from: (tabla: string) => {
        rec.tabla = tabla;
        return cadena;
      },
      rpc: (nombre: string, args: unknown) => {
        rec.rpc.push([nombre, args]);
        return Promise.resolve(rec.respuestaRpc);
      },
    },
  };
});

import {
  actualizarPlan,
  bloquearAnticipo,
  crearPlan,
  ejecutarLiquidacion,
  generarAnticipos,
  generarLiquidaciones,
  guardarCuentaDispersion,
  liquidacionDetalle,
  mensajeError,
} from './api';

beforeEach(() => {
  rec.insert = rec.update = rec.upsert = rec.upsertOpciones = null;
  rec.select = '';
  rec.eq = [];
  rec.rpc = [];
  rec.tabla = '';
  rec.respuestaRpc = { data: null, error: null };
});

const textoViejo = 'Cancelación gratis hasta 12 horas antes.';
const draft = {
  ...draftVacio(),
  titulo: 'Guatapé',
  politicaCancelacion: textoViejo,
  horasCancelacionGratuita: 48,
  horasReembolsoParcial: 24,
  porcentajeReembolsoParcial: 50,
  horaSalida: '07:30',
};
const TEXTO =
  'Cancelación gratuita hasta 48 horas antes. Entre 48 y 24 horas: reembolso del 50 %. Menos de 24 horas: sin reembolso.';

describe('guardar un plan: texto y números van juntos', () => {
  it('crearPlan escribe el texto generado y las columnas numéricas en la misma fila', async () => {
    await crearPlan('ag-1', draft);
    expect(rec.tabla).toBe('plans');
    expect(rec.insert).toMatchObject({
      agency_id: 'ag-1',
      politica_cancelacion: TEXTO,
      horas_cancelacion_gratuita: 48,
      horas_reembolso_parcial: 24,
      porcentaje_reembolso_parcial: 50,
      hora_salida: '07:30',
    });
  });

  it('actualizarPlan también: nunca guarda el texto viejo con números nuevos', async () => {
    await actualizarPlan({ ...draft, id: 'plan-9' });
    expect(rec.update).toMatchObject({ politica_cancelacion: TEXTO, horas_cancelacion_gratuita: 48 });
    expect(rec.update).not.toMatchObject({ politica_cancelacion: textoViejo });
    expect(rec.eq).toEqual([['id', 'plan-9']]);
  });
});

describe('cuenta para dispersiones', () => {
  const cuenta: CuentaDispersion = {
    banco: ' Bancolombia ',
    tipo_cuenta: 'ahorros',
    numero_cuenta: '1234 5678-9043 21',
    titular: 'EcoAndes SAS',
    tipo_documento: 'NIT',
    numero_documento: '900.123.456-7',
  };

  it('guarda una sola cuenta por agencia, normalizada', async () => {
    await guardarCuentaDispersion('ag-1', cuenta);
    expect(rec.tabla).toBe('agency_payout_accounts');
    expect(rec.upsert).toEqual({
      agency_id: 'ag-1',
      banco: 'Bancolombia',
      tipo_cuenta: 'ahorros',
      numero_cuenta: '12345678904321',
      titular: 'EcoAndes SAS',
      tipo_documento: 'NIT',
      numero_documento: '900123456-7',
    });
    expect(rec.upsertOpciones).toEqual({ onConflict: 'agency_id' });
  });

  it('los errores del servidor no repiten el número de cuenta', () => {
    const e = {
      message:
        'new row for relation "agency_payout_accounts" violates check constraint "agency_payout_accounts_numero_cuenta_check"',
      details: 'Failing row contains (…, 12345678904321, …).',
    };
    const texto = mensajeError(e);
    expect(texto).toBe('El número de cuenta debe tener de 6 a 20 dígitos.');
    expect(texto).not.toContain('12345678904321');
  });
});

describe('detalle de una liquidación', () => {
  it('el embed de items indica la FK: liquidacion_items también apunta a liquidaciones por el saldo anterior', async () => {
    await liquidacionDetalle('liq-1');
    expect(rec.tabla).toBe('liquidaciones');
    // Sin el hint PostgREST responde PGRST201 (relación ambigua) y el detalle no carga.
    expect(rec.select).toContain('liquidacion_items!liquidacion_items_liquidacion_id_fkey(');
    expect(rec.select).toContain('bookings(codigo, pax, plan_dates(fecha, plans(titulo)))');
  });
});

describe('dispersión de prueba (admin)', () => {
  it('generarLiquidaciones pide la semana elegida', async () => {
    rec.respuestaRpc = {
      data: { periodo_inicio: '2026-02-02', periodo_fin: '2026-02-08', liquidaciones: 2, items: 5 },
      error: null,
    };
    const r = await generarLiquidaciones('2026-02-02');
    expect(rec.rpc).toEqual([['generar_liquidaciones', { p_semana: '2026-02-02' }]]);
    expect(r.liquidaciones).toBe(2);
  });

  it('generarAnticipos y ejecutarLiquidacion llaman a sus funciones', async () => {
    rec.respuestaRpc = { data: { liquidaciones: 1, items: 3 }, error: null };
    expect(await generarAnticipos()).toEqual({ liquidaciones: 1, items: 3 });
    rec.respuestaRpc = { data: { referencia_prueba: 'PRUEBA-20260209-ABC' }, error: null };
    expect((await ejecutarLiquidacion('liq-1')).referencia_prueba).toBe('PRUEBA-20260209-ABC');
    expect(rec.rpc).toEqual([
      ['generar_anticipos', undefined],
      ['ejecutar_liquidacion', { p_id: 'liq-1' }],
    ]);
  });

  it('un error de la función se propaga para mostrarlo', async () => {
    rec.respuestaRpc = { data: null, error: new Error('SEMANA_NO_TERMINADA') };
    await expect(generarLiquidaciones('2026-02-09')).rejects.toThrow('SEMANA_NO_TERMINADA');
  });

  it('bloquear y desbloquear el anticipo actualiza la agencia', async () => {
    await bloquearAnticipo('ag-1', true);
    expect(rec.tabla).toBe('agencies');
    expect(rec.update).toEqual({ anticipo_bloqueado: true });
    expect(rec.eq).toEqual([['id', 'ag-1']]);
    await bloquearAnticipo('ag-1', false);
    expect(rec.update).toEqual({ anticipo_bloqueado: false });
  });
});

describe('mensajeError', () => {
  it.each([
    ['NO_AUTORIZADO', /permiso/],
    ['SEMANA_NO_TERMINADA', /aún no termina/],
    ['CUENTA_NO_REGISTRADA', /cuenta para dispersiones/],
    ['LIQUIDACION_NO_PENDIENTE', /ya fue ejecutada/],
    ['MONTO_NO_POSITIVO', /cero o negativo/],
  ])('traduce %s', (codigo, esperado) => {
    expect(mensajeError(new Error(`${codigo}`))).toMatch(esperado);
  });

  it('un error desconocido se muestra tal cual', () => {
    expect(mensajeError(new Error('algo raro'))).toBe('algo raro');
  });
});
