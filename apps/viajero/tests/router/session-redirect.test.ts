import { ConsentState } from '@/features/legal/view-models/consent-view-model';
import { encodeQueryComponent, safeDestination, isScreenVisible, sessionRedirect } from '@/router';

/**
 * La decisión del redirect es una función pura: sesión + consentimiento + ubicación. Port 1:1 de
 * `sesion_redirect_test.dart` (+ `isScreenVisible`, que en Expo Router decide si una pantalla del
 * stack se monta).
 */

function redirect(
  location: string,
  { session = true, consent = ConsentState.accepted }: { session?: boolean; consent?: ConsentState } = {},
) {
  return sessionRedirect({ hasSession: session, consent, location });
}

const allStates = Object.values(ConsentState);

describe('sin sesión', () => {
  test('cualquier pantalla privada va a /login', () => {
    for (const location of ['/', '/reservas', '/plan/p1', '/comparar', '/consentimiento']) {
      expect([location, redirect(location, { session: false })]).toEqual([location, '/login']);
    }
  });

  test('/login y los documentos legales se pueden ver', () => {
    expect(redirect('/login', { session: false })).toBeNull();
    expect(redirect('/legal/privacidad', { session: false })).toBeNull();
  });

  test('el estado del consentimiento no importa', () => {
    for (const state of allStates) {
      expect(redirect('/', { session: false, consent: state })).toBe('/login');
    }
  });
});

describe('con sesión y consentimiento al día', () => {
  test('se queda donde está', () => {
    for (const location of ['/', '/reservas', '/plan/p1', '/pago/resultado', '/legal/x']) {
      expect([location, redirect(location)]).toEqual([location, null]);
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
  for (const state of [ConsentState.checking, ConsentState.pending, ConsentState.error]) {
    describe(state, () => {
      test('todo lleva a /consentimiento recordando la ubicación original', () => {
        expect(redirect('/', { consent: state })).toBe('/consentimiento?desde=%2F');
        expect(redirect('/login', { consent: state })).toBe('/consentimiento?desde=%2Flogin');
        expect(redirect('/reservas/b-1', { consent: state })).toBe('/consentimiento?desde=%2Freservas%2Fb-1');
      });

      test('la query de la ubicación original viaja codificada', () => {
        expect(redirect('/comparar?ids=a,b', { consent: state })).toBe(
          '/consentimiento?desde=%2Fcomparar%3Fids%3Da%2Cb',
        );
        expect(redirect('/pago/resultado?reserva=r1&x=2', { consent: state })).toBe(
          '/consentimiento?desde=%2Fpago%2Fresultado%3Freserva%3Dr1%26x%3D2',
        );
      });

      test('/consentimiento (con o sin desde) y los legales se quedan', () => {
        expect(redirect('/consentimiento', { consent: state })).toBeNull();
        expect(redirect('/consentimiento?desde=%2Freservas', { consent: state })).toBeNull();
        expect(redirect('/legal/terminos-viajeros', { consent: state })).toBeNull();
      });
    });
  }
});

describe('al quedar aceptado en /consentimiento', () => {
  const acceptedFrom = (value: string) => redirect(`/consentimiento?desde=${encodeQueryComponent(value)}`);

  test('vuelve a la ubicación original, con su query', () => {
    expect(acceptedFrom('/reservas/b-1')).toBe('/reservas/b-1');
    expect(acceptedFrom('/comparar?ids=a,b')).toBe('/comparar?ids=a,b');
    expect(acceptedFrom('/plan/p1')).toBe('/plan/p1');
  });

  test('un destino que no es interno y seguro se ignora y va al inicio', () => {
    for (const bad of [
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
      expect([bad, acceptedFrom(bad)]).toEqual([bad, '/']);
    }
  });

  test('sin parámetro desde va al inicio', () => {
    expect(redirect('/consentimiento?otro=1')).toBe('/');
  });
});

describe('safeDestination', () => {
  test('conserva ubicaciones internas', () => {
    expect(safeDestination('/reservas/b-1')).toBe('/reservas/b-1');
    expect(safeDestination('/')).toBe('/');
    expect(safeDestination('/comparar?ids=a,b')).toBe('/comparar?ids=a,b');
  });

  test('descarta lo demás', () => {
    for (const bad of [null, undefined, '', '//evil.com', 'https://x', '/login', '/consentimiento']) {
      expect([bad, safeDestination(bad)]).toEqual([bad, null]);
    }
  });

  test('una ubicación mal codificada (no parsea) también se descarta', () => {
    expect(safeDestination('/plan/%E0%A4%A')).toBeNull();
  });
});

describe('isScreenVisible (qué pantallas del stack se montan)', () => {
  const visible = (route: string, params: Record<string, unknown> = {}, options: { session?: boolean; consent?: ConsentState } = {}) =>
    isScreenVisible({
      hasSession: options.session ?? true,
      consent: options.consent ?? ConsentState.accepted,
      routeName: route,
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
    for (const state of [ConsentState.checking, ConsentState.pending, ConsentState.error]) {
      for (const route of ['(tabs)', 'plan/[id]', 'reservas/[bookingId]', 'comparar', '+not-found', 'login']) {
        expect([state, route, visible(route, { id: 'x', bookingId: 'x' }, { consent: state })]).toEqual([state, route, false]);
      }
      expect(visible('consentimiento', {}, { consent: state })).toBe(true);
      expect(visible('legal/[doc]', { doc: 'privacidad' }, { consent: state })).toBe(true);
    }
  });

  test('sin sesión solo el login y los legales', () => {
    expect(visible('login', {}, { session: false })).toBe(true);
    expect(visible('legal/[doc]', { doc: 'x' }, { session: false })).toBe(true);
    expect(visible('consentimiento', {}, { session: false })).toBe(false);
    expect(visible('(tabs)', {}, { session: false })).toBe(false);
  });
});
