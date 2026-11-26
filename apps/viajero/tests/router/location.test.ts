import { buildLocation } from '@/router/location';

describe('buildLocation (ruta + query con hooks estables de Expo Router)', () => {
  test('los parámetros de la ruta ([bookingId]) no se repiten en la query', () => {
    expect(buildLocation('/reservas/b-1', ['reservas', '[bookingId]'], { bookingId: 'b-1' })).toBe('/reservas/b-1');
  });

  test('la query se conserva y se codifica como Uri.encodeQueryComponent', () => {
    expect(buildLocation('/comparar', ['comparar'], { ids: 'p1,p2' })).toBe('/comparar?ids=p1%2Cp2');
    expect(buildLocation('/consentimiento', ['consentimiento'], { desde: '/plan/x?a=1' })).toBe(
      '/consentimiento?desde=%2Fplan%2Fx%3Fa%3D1',
    );
  });

  test('parámetros repetidos van uno por uno; los vacíos o ausentes no', () => {
    expect(buildLocation('/pago/resultado', ['pago', 'resultado'], { id: ['t1', 't2'], x: undefined })).toBe(
      '/pago/resultado?id=t1&id=t2',
    );
  });

  test('catch-all ([...resto]) también es de la ruta', () => {
    expect(buildLocation('/a/b/c', ['[...resto]'], { resto: ['a', 'b', 'c'] })).toBe('/a/b/c');
  });

  test('+not-found es el catch-all de Expo Router: su parámetro «not-found» no va a la query', () => {
    expect(buildLocation('/esta/no/existe', ['+not-found'], { 'not-found': ['esta', 'no', 'existe'], x: '1' })).toBe(
      '/esta/no/existe?x=1',
    );
  });
});
