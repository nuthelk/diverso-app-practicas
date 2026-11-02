import { beforeEach, describe, expect, it, vi } from 'vitest';
import { rec, reiniciar } from '@/test/supabase-falso';
import { mensajeError } from '@/shared/api/errores';
import type { CuentaDispersion } from './liquidaciones';
import { guardarCuentaDispersion, liquidacionDetalle } from './liquidaciones.api';

vi.mock('@/shared/api/supabase', () => import('@/test/supabase-falso'));

beforeEach(reiniciar);

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
