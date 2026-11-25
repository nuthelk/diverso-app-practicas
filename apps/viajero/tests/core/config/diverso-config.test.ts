import { configFrom, metroHost } from '@/core/config/diverso-config';

describe('configDesde', () => {
  test('sin variables usa la instancia local de Supabase (puerto 54331)', () => {
    const c = configFrom({});
    expect(c.supabaseUrl).toBe('http://127.0.0.1:54331');
    expect(c.supabaseKey).toMatch(/^sb_publishable_/);
  });

  test('EXPO_PUBLIC_SUPABASE_URL / _KEY sobreescriben los valores; vacío cuenta como ausente', () => {
    expect(configFrom({ url: 'http://10.0.2.2:54331', key: 'k' })).toMatchObject({
      supabaseUrl: 'http://10.0.2.2:54331',
      supabaseKey: 'k',
    });
    expect(configFrom({ url: '', key: '' }).supabaseUrl).toBe('http://127.0.0.1:54331');
  });

  test('en desarrollo en un dispositivo, el Supabase local se busca en el host de Metro (emulador, simulador o celular)', () => {
    expect(configFrom({ devHost: '192.168.1.4' }).supabaseUrl).toBe('http://192.168.1.4:54331');
    // La variable explícita siempre gana.
    expect(configFrom({ url: 'https://x.supabase.co', devHost: '192.168.1.4' }).supabaseUrl).toBe('https://x.supabase.co');
    // Sin host (web, tests, producción) queda el valor local de siempre.
    expect(configFrom({ devHost: '' }).supabaseUrl).toBe('http://127.0.0.1:54331');
  });

  test('hostDeMetro saca el host de `hostUri` de Expo', () => {
    expect(metroHost('192.168.1.4:8081')).toBe('192.168.1.4');
    expect(metroHost('127.0.0.1:8083')).toBe('127.0.0.1');
    expect(metroHost('[::1]:8081')).toBe('[::1]');
    expect(metroHost(undefined)).toBeUndefined();
    expect(metroHost('')).toBeUndefined();
  });

  test('rutas de retorno del pago', () => {
    const c = configFrom({});
    expect(c.paymentResultPath).toBe('/pago/resultado');
    expect(c.mobilePaymentReturnUrl).toBe('https://diverso.app/pago/resultado');
  });
});
