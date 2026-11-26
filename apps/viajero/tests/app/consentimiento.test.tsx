import { router } from 'expo-router';
import { act, fireEvent, screen } from 'expo-router/testing-library';

import { ConsentViewModel } from '@/features/legal/view-models/consent-view-model';

import { startApp, settle, visibleScreen } from '../support/app';
import { controlAppState } from '../support/app-state';
import { FakeAuth } from '../support/fake-auth';
import { FakeCatalogRepository } from '../support/fake-catalog-repository';
import { createGate, type Gate } from '../support/gate';
import { testDependencies } from '../support/test-dependencies';

/**
 * El consentimiento (Ley 1581) es estado de enrutamiento: con sesión y sin la autorización
 * vigente —o sin poder comprobarla— la app muestra `/consentimiento` y NINGUNA pantalla protegida
 * se monta ni carga datos (gotcha 3). Sin red ni Supabase. Port de `router/consentimiento_test.dart`
 * y `router/consentimiento_guard_test.dart` (los casos J1/J2 dependen del comparador y la reseña:
 * los portan T5 y T7).
 */

const pendientesDePrueba = ['tratamiento_datos', 'terminos_viajero'];

/**
 * Cargas de datos que llegaron a pedirse a los repositorios (`reservas.consultas` en el test de
 * Flutter): «no carga nada» se comprueba aquí, no con un render. Cada llamada queda anotada como
 * `Repo.metodo(args)` y nunca resuelve, así la pantalla queda cargando y no hay efectos tardíos.
 */
const cargas: string[] = [];
function registrador<T extends object>(nombre: string): T {
  return new Proxy({} as T, {
    get(_objetivo, clave) {
      if (typeof clave === 'symbol' || clave === 'then') return undefined;
      return (...args: unknown[]) => {
        cargas.push(`${nombre}.${String(clave)}(${args.map((a) => JSON.stringify(a)).join(', ')})`);
        return new Promise(() => {});
      };
    },
  });
}
beforeEach(() => {
  cargas.length = 0;
});

const pantallaConsentimiento = () => screen.queryByText('Antes de continuar');
const barraInferior = () => screen.queryByTestId('barra-inferior');
const avisoSinVerificar = () => screen.queryByText(/No pudimos verificar tu autorización/);

async function arrancar(auth: FakeAuth, url = '/') {
  return startApp(
    url,
    testDependencies({
      auth,
      bookings: registrador('BookingRepository'),
      catalog: registrador('CatalogRepository'),
      reviews: registrador('ReviewRepository'),
      gateway: registrador('PaymentGateway'),
    }),
  );
}

async function marcarCasillasYAceptar() {
  for (const casilla of screen.getAllByRole('checkbox')) await fireEvent.press(casilla);
  await fireEvent.press(screen.getByText('Aceptar y continuar'));
}

let appState: ReturnType<typeof controlAppState>;
beforeEach(() => {
  appState = controlAppState();
});
afterEach(() => {
  appState.restore();
  jest.useRealTimers();
});

describe('consentimiento como estado de enrutamiento', () => {
  test('con el consentimiento al día se entra a la app', async () => {
    await arrancar(new FakeAuth());
    expect(barraInferior()).toBeOnTheScreen();
    expect(pantallaConsentimiento()).toBeNull();
  });

  test('con documentos sin aceptar se pide la autorización y no se ve la app', async () => {
    const r = await arrancar(new FakeAuth({ consentResponses: [pendientesDePrueba] }));
    expect(pantallaConsentimiento()).toBeOnTheScreen();
    expect(screen.getByText('Aceptar y continuar')).toBeOnTheScreen();
    expect(barraInferior()).toBeNull();
    expect(visibleScreen('CatalogView')).toBeNull();
    expect(r.getPathnameWithParams()).toBe('/consentimiento?desde=%2F');
  });

  test('si la consulta falla una vez, tras «Reintentar» se sigue pidiendo la autorización', async () => {
    const auth = new FakeAuth({ consentResponses: [new Error('sin red'), pendientesDePrueba] });
    await arrancar(auth);

    // Con un error NO se deja pasar: pantalla de consentimiento con aviso y sin formulario.
    expect(pantallaConsentimiento()).toBeOnTheScreen();
    expect(avisoSinVerificar()).toBeOnTheScreen();
    expect(screen.queryByText('Aceptar y continuar')).toBeNull();
    expect(barraInferior()).toBeNull();

    await fireEvent.press(screen.getByText('Reintentar'));
    await settle();

    expect(auth.consentQueries).toBe(2);
    expect(avisoSinVerificar()).toBeNull();
    expect(screen.getByText('Aceptar y continuar')).toBeOnTheScreen();
    expect(barraInferior()).toBeNull();
  });

  test('si la consulta falla y luego el usuario está al día, «Reintentar» entra a la app', async () => {
    await arrancar(new FakeAuth({ consentResponses: [new Error('sin red'), []] }));
    expect(avisoSinVerificar()).toBeOnTheScreen();

    await fireEvent.press(screen.getByText('Reintentar'));
    await settle();

    expect(pantallaConsentimiento()).toBeNull();
    expect(barraInferior()).toBeOnTheScreen();
  });

  test('si la consulta falla, al volver a primer plano se reintenta sola', async () => {
    const auth = new FakeAuth({ consentResponses: [new Error('sin red'), pendientesDePrueba] });
    await arrancar(auth);
    expect(auth.consentQueries).toBe(1);

    await appState.goToBackgroundAndBack();
    await settle();

    expect(auth.consentQueries).toBe(2);
    expect(screen.getByText('Aceptar y continuar')).toBeOnTheScreen();
  });

  test('al volver a primer plano con el consentimiento al día no se vuelve a consultar', async () => {
    const auth = new FakeAuth();
    await arrancar(auth);

    await appState.goToBackgroundAndBack();
    await settle();

    expect(auth.consentQueries).toBe(1);
    expect(barraInferior()).toBeOnTheScreen();
  });

  test('aceptar registra los documentos pendientes y lleva a la app', async () => {
    const auth = new FakeAuth({ consentResponses: [pendientesDePrueba, []] });
    await arrancar(auth);

    await marcarCasillasYAceptar();
    await settle();

    expect(auth.recordedConsents).toEqual(pendientesDePrueba);
    expect(pantallaConsentimiento()).toBeNull();
    expect(barraInferior()).toBeOnTheScreen();
  });

  test('si no se puede guardar la autorización avisa y se queda en la pantalla', async () => {
    const auth = new FakeAuth({ consentResponses: [pendientesDePrueba] });
    auth.recordConsentFailure = true;
    await arrancar(auth);

    await marcarCasillasYAceptar();
    await settle();

    expect(screen.getByText('No pudimos guardar tu autorización. Intenta de nuevo.')).toBeOnTheScreen();
    expect(pantallaConsentimiento()).toBeOnTheScreen();
    expect(barraInferior()).toBeNull();
  });

  describe('sesión', () => {
    test('sin sesión se ve el login y no se consulta el consentimiento', async () => {
      const auth = new FakeAuth({ userId: null });
      await arrancar(auth);
      expect(screen.getAllByText('Entrar').length).toBeGreaterThan(0);
      expect(pantallaConsentimiento()).toBeNull();
      expect(auth.consentQueries).toBe(0);
    });

    test('al iniciar sesión se consulta el consentimiento de ese usuario', async () => {
      const auth = new FakeAuth({ userId: null, consentResponses: [pendientesDePrueba] });
      await arrancar(auth);

      await act(async () => auth.changeSession('viajero-2'));
      await settle();

      expect(auth.consentQueries).toBe(1);
      expect(pantallaConsentimiento()).toBeOnTheScreen();
    });

    test('entrar desde el login con el consentimiento al día lleva al inicio', async () => {
      const auth = new FakeAuth({ userId: null });
      const r = await arrancar(auth, '/login');
      await fireEvent.changeText(screen.getByLabelText('Correo'), 'ana@correo.test');
      await fireEvent.changeText(screen.getByLabelText('Contraseña'), 'secreto1');
      await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));
      await act(async () => auth.changeSession('viajero-1'));
      await settle();

      expect(r.getPathname()).toBe('/');
      expect(visibleScreen('CatalogView')).toBeOnTheScreen();
    });

    test('«Cerrar sesión» en la pantalla de consentimiento lleva al login', async () => {
      await arrancar(new FakeAuth({ consentResponses: [pendientesDePrueba] }));
      expect(pantallaConsentimiento()).toBeOnTheScreen();

      await fireEvent.press(screen.getByText('Cerrar sesión'));
      await settle();

      expect(pantallaConsentimiento()).toBeNull();
      expect(screen.getAllByText('Entrar').length).toBeGreaterThan(0);
    });

    test('al cerrar sesión desde dentro de la app se vuelve al login', async () => {
      const auth = new FakeAuth();
      const r = await arrancar(auth, '/plan/p1');
      expect(visibleScreen('PlanDetailView')).toBeOnTheScreen();

      await act(async () => auth.changeSession(null));
      await settle();

      expect(r.getPathname()).toBe('/login');
      expect(visibleScreen('PlanDetailView')).toBeNull();
      expect(visibleScreen('CatalogView')).toBeNull();
    });
  });
});

/** Cada consulta de consentimiento queda en [abiertas] hasta que el test la responde. */
class AuthManual extends FakeAuth {
  readonly abiertas: Gate<string[]>[] = [];

  constructor(usuario: string | null) {
    super({ userId: usuario });
    this.profile = null;
  }

  override pendingConsents(): Promise<string[]> {
    this.consentQueries++;
    const c = createGate<string[]>();
    this.abiertas.push(c);
    return c.promise;
  }
}

async function responder(c: Gate<string[]> | undefined, valor: string[] | Error) {
  await act(async () => {
    if (valor instanceof Error) c!.reject(valor);
    else c!.resolve(valor);
  });
  await settle();
}

describe('guardia: mientras se verifica el consentimiento', () => {
  test('V1: un enlace a una pantalla protegida no la abre (ni la monta) y conserva el destino', async () => {
    const auth = new AuthManual('viajero-1');
    const r = await arrancar(auth, '/reservas/b-1');

    expect(r.getPathname()).toBe('/consentimiento');
    expect(r.getPathnameWithParams()).toBe('/consentimiento?desde=%2Freservas%2Fb-1');
    expect(visibleScreen('ReservaDetalleView')).toBeNull();
    expect(cargas).toEqual([]);
    expect(screen.getByTestId('consentimiento-verificando')).toBeOnTheScreen();

    await responder(auth.abiertas[0], []);
  });

  test('V1: aceptado, el enlace original se conserva', async () => {
    const auth = new AuthManual('viajero-1');
    const r = await arrancar(auth, '/reservas/b-1');

    await responder(auth.abiertas[0], []);

    expect(r.getPathname()).toBe('/reservas/b-1');
    expect(visibleScreen('ReservaDetalleView')).toBeOnTheScreen();
    // Cargó la reserva b-1 una sola vez, y recién con el consentimiento confirmado.
    expect(cargas).toEqual(['BookingRepository.booking("b-1")']);
  });

  test('V1: pendiente, tras aceptar se llega al enlace original', async () => {
    const auth = new AuthManual('viajero-1');
    const r = await arrancar(auth, '/perfil');

    await responder(auth.abiertas[0], pendientesDePrueba);
    expect(pantallaConsentimiento()).toBeOnTheScreen();
    expect(r.getPathnameWithParams()).toBe('/consentimiento?desde=%2Fperfil');

    await marcarCasillasYAceptar();
    await settle(2);
    await responder(auth.abiertas[1], []);

    expect(r.getPathname()).toBe('/perfil');
    expect(visibleScreen('ProfileView')).toBeOnTheScreen();
  });

  test('si la consulta no responde nunca, a los 15 s hay «Reintentar»', async () => {
    const auth = new AuthManual('viajero-1');
    const r = await arrancar(auth, '/plan/p1');
    expect(r.getPathname()).toBe('/consentimiento');
    expect(screen.queryByText('Reintentar')).toBeNull();

    await act(async () => {
      await jest.advanceTimersByTimeAsync(ConsentViewModel.timeoutMs);
    });
    await settle();

    expect(r.getPathname()).toBe('/consentimiento');
    expect(screen.getByText('Reintentar')).toBeOnTheScreen();
    expect(visibleScreen('PlanDetailView')).toBeNull();
  });
});

describe('guardia: cambio de usuario', () => {
  test('U1: A aceptó y entra B sin cerrar sesión: se vuelve a comprobar', async () => {
    const auth = new AuthManual('A');
    // El catálogo ya es la pantalla real (T5): se cuenta cuántas veces se montó por sus cargas.
    const catalogo = new FakeCatalogRepository();
    const r = await startApp('/', testDependencies({ auth, catalog: catalogo }));
    await responder(auth.abiertas[0], []);
    expect(barraInferior()).toBeOnTheScreen();

    expect(catalogo.searches).toHaveLength(1);
    await act(async () => auth.changeSession('B'));
    await settle(1);
    expect(auth.abiertas).toHaveLength(2);
    expect(visibleScreen('CatalogView')).toBeNull();
    await responder(auth.abiertas[1], pendientesDePrueba);

    expect(r.getPathname()).toBe('/consentimiento');
    // Mientras B se verificaba, el catálogo de A no volvió a montarse.
    expect(catalogo.searches).toHaveLength(1);
  });

  test('U2: la respuesta «aceptado» tardía de A no cuenta para B', async () => {
    const auth = new AuthManual('A');
    const r = await arrancar(auth, '/');
    await act(async () => auth.changeSession(null));
    await settle(1);
    await act(async () => auth.changeSession('B'));
    await settle(1);

    await responder(auth.abiertas[0], []); // A, tarde
    await responder(auth.abiertas[1], pendientesDePrueba); // B

    expect(r.getPathname()).toBe('/consentimiento');
    expect(pantallaConsentimiento()).toBeOnTheScreen();
  });
});

describe('guardia: con error o pendiente nada protegido se abre', () => {
  const urls = [
    '/',
    '/agencias',
    '/reservas',
    '/perfil',
    '/agencia/a1',
    '/plan/p1',
    '/checkout/p1/f1',
    '/pago/resultado?id=t1',
    '/reserva/b1',
    '/reservas/b1',
    '/resena/b1',
    '/resena',
    '/comparar?ids=p1,p2',
    '/checkout',
    '/exito',
    '/login',
    '/esta/no/existe',
    '/consentimiento?x=1',
    '/legal/privacidad',
    '/legal/no-existe',
  ];
  for (const url of urls) {
    for (const conError of [true, false]) {
      test(`${conError ? 'error' : 'pendiente'}: ${url}`, async () => {
        const auth = new AuthManual('viajero-1');
        const r = await arrancar(auth, url);
        await responder(auth.abiertas[0], conError ? new Error('sin red') : pendientesDePrueba);

        const esperado = url.startsWith('/legal/') ? url : '/consentimiento';
        expect(r.getPathname()).toBe(esperado);
        if (!url.startsWith('/legal/')) expect(pantallaConsentimiento()).toBeOnTheScreen();
        expect(screen.queryAllByTestId(/^pantalla-/)).toHaveLength(0);
        expect(cargas).toEqual([]);
      });
    }
  }

  test('G3: pendiente, ni navigate ni push llegan a una pantalla protegida', async () => {
    const auth = new AuthManual('viajero-1');
    const r = await arrancar(auth, '/consentimiento');
    await responder(auth.abiertas[0], pendientesDePrueba);

    await act(async () => router.navigate('/reservas/b1'));
    await settle();
    expect(r.getPathname()).toBe('/consentimiento');
    expect(visibleScreen('ReservaDetalleView')).toBeNull();

    await act(async () => router.push('/plan/p1'));
    await settle();
    expect(r.getPathname()).toBe('/consentimiento');
    expect(visibleScreen('PlanDetailView')).toBeNull();
    expect(pantallaConsentimiento()).toBeOnTheScreen();
    expect(cargas).toEqual([]);
  });
});
