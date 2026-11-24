import { configDesde } from '@/core/config/diverso-config';

describe('configDesde', () => {
  test('sin variables usa la instancia local de Supabase (puerto 54331)', () => {
    const c = configDesde({});
    expect(c.supabaseUrl).toBe('http://127.0.0.1:54331');
    expect(c.supabaseKey).toMatch(/^sb_publishable_/);
  });

  test('EXPO_PUBLIC_SUPABASE_URL / _KEY sobreescriben los valores; vacío cuenta como ausente', () => {
    expect(configDesde({ url: 'http://10.0.2.2:54331', key: 'k' })).toMatchObject({
      supabaseUrl: 'http://10.0.2.2:54331',
      supabaseKey: 'k',
    });
    expect(configDesde({ url: '', key: '' }).supabaseUrl).toBe('http://127.0.0.1:54331');
  });

  test('rutas de retorno del pago', () => {
    const c = configDesde({});
    expect(c.pagoResultadoPath).toBe('/pago/resultado');
    expect(c.pagoRetornoMovil).toBe('https://diverso.app/pago/resultado');
  });
});
