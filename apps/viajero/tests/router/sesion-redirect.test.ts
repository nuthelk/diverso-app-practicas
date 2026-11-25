import { ConsentState } from '@/features/legal/view-models/consent-view-model';
import { codificarComponenteQuery, destinoSeguro, pantallaVisible, sesionRedirect } from '@/router';

/**
 * La decisión del redirect es una función pura: sesión + consentimiento + ubicación. Port 1:1 de
 * `sesion_redirect_test.dart` (+ `pantallaVisible`, que en Expo Router decide si una pantalla del
 * stack se monta).
 */

function redirect(
  ubicacion: string,
  { sesion = true, consentimiento = ConsentState.accepted }: { sesion?: boolean; consentimiento?: ConsentState } = {},
) {
  return sesionRedirect({ haySesion: sesion, consentimiento, ubicacion });
}

const todos = Object.values(ConsentState);

describe('sin sesión', () => {
  test('cualquier pantalla privada va a /login', () => {
    for (const ubicacion of ['/', '/reservas', '/plan/p1', '/comparar', '/consentimiento']) {
      expect([ubicacion, redirect(ubicacion, { sesion: false })]).toEqual([ubicacion, '/login']);
    }
  });

  test('/login y los documentos legales se pueden ver', () => {
    expect(redirect('/login', { sesion: false })).toBeNull();
    expect(redirect('/legal/privacidad', { sesion: false })).toBeNull();
  });

  test('el estado del consentimiento no importa', () => {
    for (const estado of todos) {
      expect(redirect('/', { sesion: false, consentimiento: estado })).toBe('/login');
    }
  });
});

describe('con sesión y consentimiento al día', () => {
  test('se queda donde está', () => {
    for (const ubicacion of ['/', '/reservas', '/plan/p1', '/pago/resultado', '/legal/x']) {
      expect([ubicacion, redirect(ubicacion)]).toEqual([ubicacion, null]);
    }
  });

  test('/login lleva al inicio', () => {
    expect(redirect('/login')).toBe('/');
  });

  test('/consentimiento sin destino lleva al inicio', () => {
    expect(redirect('/consentimiento')).toBe('/');
  });
});

describe('con sesión y consentimiento sin confirmar (verificando, pendiente o error)', () => {
  for (const estado of [ConsentState.checking, ConsentState.pending, ConsentState.error]) {
    describe(estado, () => {
      test('todo lleva a /consentimiento recordando la ubicación original', () => {
        expect(redirect('/', { consentimiento: estado })).toBe('/consentimiento?desde=%2F');
        expect(redirect('/login', { consentimiento: estado })).toBe('/consentimiento?desde=%2Flogin');
        expect(redirect('/reservas/b-1', { consentimiento: estado })).toBe('/consentimiento?desde=%2Freservas%2Fb-1');
      });

      test('la query de la ubicación original viaja codificada', () => {
        expect(redirect('/comparar?ids=a,b', { consentimiento: estado })).toBe(
          '/consentimiento?desde=%2Fcomparar%3Fids%3Da%2Cb',
        );
        expect(redirect('/pago/resultado?reserva=r1&x=2', { consentimiento: estado })).toBe(
          '/consentimiento?desde=%2Fpago%2Fresultado%3Freserva%3Dr1%26x%3D2',
        );
      });

      test('/consentimiento (con o sin desde) y los legales se quedan', () => {
        expect(redirect('/consentimiento', { consentimiento: estado })).toBeNull();
        expect(redirect('/consentimiento?desde=%2Freservas', { consentimiento: estado })).toBeNull();
        expect(redirect('/legal/terminos-viajeros', { consentimiento: estado })).toBeNull();
      });
    });
  }
});

describe('al quedar aceptado en /consentimiento', () => {
  const desde = (valor: string) => redirect(`/consentimiento?desde=${codificarComponenteQuery(valor)}`);

  test('vuelve a la ubicación original, con su query', () => {
    expect(desde('/reservas/b-1')).toBe('/reservas/b-1');
    expect(desde('/comparar?ids=a,b')).toBe('/comparar?ids=a,b');
    expect(desde('/plan/p1')).toBe('/plan/p1');
  });

  test('un destino que no es interno y seguro se ignora y va al inicio', () => {
    for (const malo of [
      '//evil.com',
      '//evil.com/x',
      'https://x',
      'https://x.com/reservas',
      'javascript:alert(1)',
      '/\\evil.com',
      'reservas',
      '',
      '/login',
      '/login?x=1',
      '/consentimiento',
      '/consentimiento?desde=%2Freservas',
    ]) {
      expect([malo, desde(malo)]).toEqual([malo, '/']);
    }
  });

  test('sin parámetro desde va al inicio', () => {
    expect(redirect('/consentimiento?otro=1')).toBe('/');
  });
});

describe('destinoSeguro', () => {
  test('conserva ubicaciones internas', () => {
    expect(destinoSeguro('/reservas/b-1')).toBe('/reservas/b-1');
    expect(destinoSeguro('/')).toBe('/');
    expect(destinoSeguro('/comparar?ids=a,b')).toBe('/comparar?ids=a,b');
  });

  test('descarta lo demás', () => {
    for (const malo of [null, undefined, '', '//evil.com', 'https://x', '/login', '/consentimiento']) {
      expect([malo, destinoSeguro(malo)]).toEqual([malo, null]);
    }
  });

  test('una ubicación mal codificada (no parsea) también se descarta', () => {
    expect(destinoSeguro('/plan/%E0%A4%A')).toBeNull();
  });
});

describe('pantallaVisible (qué pantallas del stack se montan)', () => {
  const visible = (ruta: string, params: Record<string, unknown> = {}, opciones: { sesion?: boolean; consentimiento?: ConsentState } = {}) =>
    pantallaVisible({
      haySesion: opciones.sesion ?? true,
      consentimiento: opciones.consentimiento ?? ConsentState.accepted,
      nombreRuta: ruta,
      params,
    });

  test('con sesión y al día se montan las protegidas, no el login ni el consentimiento', () => {
    expect(visible('(tabs)')).toBe(true);
    expect(visible('plan/[id]', { id: 'p1' })).toBe(true);
    expect(visible('+not-found')).toBe(true);
    expect(visible('login')).toBe(false);
    expect(visible('consentimiento')).toBe(false);
    expect(visible('legal/[doc]', { doc: 'privacidad' })).toBe(true);
  });

  test('sin confirmar el consentimiento NINGUNA protegida se monta (gotcha 3)', () => {
    for (const estado of [ConsentState.checking, ConsentState.pending, ConsentState.error]) {
      for (const ruta of ['(tabs)', 'plan/[id]', 'reservas/[bookingId]', 'comparar', '+not-found', 'login']) {
        expect([estado, ruta, visible(ruta, { id: 'x', bookingId: 'x' }, { consentimiento: estado })]).toEqual([estado, ruta, false]);
      }
      expect(visible('consentimiento', {}, { consentimiento: estado })).toBe(true);
      expect(visible('legal/[doc]', { doc: 'privacidad' }, { consentimiento: estado })).toBe(true);
    }
  });

  test('sin sesión solo el login y los legales', () => {
    expect(visible('login', {}, { sesion: false })).toBe(true);
    expect(visible('legal/[doc]', { doc: 'x' }, { sesion: false })).toBe(true);
    expect(visible('consentimiento', {}, { sesion: false })).toBe(false);
    expect(visible('(tabs)', {}, { sesion: false })).toBe(false);
  });
});
