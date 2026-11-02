import { beforeEach, describe, expect, it, vi } from 'vitest';
import { rec, reiniciar } from '@/test/supabase-falso';
import {
  bloquearAnticipo,
  ejecutarLiquidacion,
  generarAnticipos,
  generarLiquidaciones,
} from './admin.api';

vi.mock('@/shared/api/supabase', () => import('@/test/supabase-falso'));

beforeEach(reiniciar);

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
