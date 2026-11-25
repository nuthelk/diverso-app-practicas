import { configDesde, hostDeMetro } from '@/core/config/diverso-config';

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

  test('en desarrollo en un dispositivo, el Supabase local se busca en el host de Metro (emulador, simulador o celular)', () => {
    expect(configDesde({ hostDesarrollo: '192.168.1.4' }).supabaseUrl).toBe('http://192.168.1.4:54331');
    // La variable explícita siempre gana.
    expect(configDesde({ url: 'https://x.supabase.co', hostDesarrollo: '192.168.1.4' }).supabaseUrl).toBe('https://x.supabase.co');
    // Sin host (web, tests, producción) queda el valor local de siempre.
    expect(configDesde({ hostDesarrollo: '' }).supabaseUrl).toBe('http://127.0.0.1:54331');
  });

  test('hostDeMetro saca el host de `hostUri` de Expo', () => {
    expect(hostDeMetro('192.168.1.4:8081')).toBe('192.168.1.4');
    expect(hostDeMetro('127.0.0.1:8083')).toBe('127.0.0.1');
    expect(hostDeMetro('[::1]:8081')).toBe('[::1]');
    expect(hostDeMetro(undefined)).toBeUndefined();
    expect(hostDeMetro('')).toBeUndefined();
  });

  test('rutas de retorno del pago', () => {
    const c = configDesde({});
    expect(c.pagoResultadoPath).toBe('/pago/resultado');
    expect(c.pagoRetornoMovil).toBe('https://diverso.app/pago/resultado');
  });
});
