import { beforeEach, describe, expect, it, vi } from 'vitest';
import { rec, reiniciar } from '@/test/supabase-falso';
import { draftVacio } from './plan';
import { actualizarPlan, crearPlan } from './planes.api';

vi.mock('@/shared/api/supabase', () => import('@/test/supabase-falso'));

beforeEach(reiniciar);

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
