import { act, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { DependenciesProvider } from '@/composition';
import { SessionProvider, useSession } from '@/features/auth/view-models/SessionProvider';
import { ConsentProvider, useConsent } from '@/features/legal/view-models/ConsentProvider';
import { ConsentState } from '@/features/legal/view-models/consent-view-model';

import { controlAppState } from '../support/app-state';
import { FakeAuth } from '../support/fake-auth';
import { flushMicrotasks } from '../support/gate';
import { testDependencies } from '../support/test-dependencies';

/**
 * Estados globales (los `ChangeNotifierProvider` raíz de Flutter): la sesión de Supabase y el
 * consentimiento, como Context providers que comparten todas las pantallas.
 */

function Probe() {
  const session = useSession();
  const consent = useConsent();
  return (
    <Text testID="probe">
      {session.loading ? 'loading' : (session.userId ?? 'no-session')}|{consent.state}
    </Text>
  );
}

async function mount(auth: FakeAuth) {
  const r = await render(
    <DependenciesProvider dependencies={testDependencies({ auth })}>
      <SessionProvider>
        <ConsentProvider>
          <Probe />
        </ConsentProvider>
      </SessionProvider>
    </DependenciesProvider>,
  );
  return r;
}

const probeText = () => screen.getByTestId('probe').props.children.join('');

let appState: ReturnType<typeof controlAppState>;
beforeEach(() => {
  appState = controlAppState();
});
afterEach(() => appState.restore());

describe('SessionProvider', () => {
  test('mientras no se lee la sesión guardada está «cargando»; luego da el usuario', async () => {
    const auth = new FakeAuth();
    let resolver!: (id: string | null) => void;
    jest.spyOn(auth, 'currentUserId').mockReturnValue(new Promise((r) => (resolver = r)));
    await mount(auth);
    expect(probeText()).toBe('loading|checking');

    await act(async () => resolver('viajero-1'));
    await act(flushMicrotasks);
    expect(probeText()).toMatch(/^viajero-1\|/);
  });

  test('sigue los cambios de sesión (entrar, cambiar de usuario, salir)', async () => {
    const auth = new FakeAuth({ userId: null });
    await mount(auth);
    await act(flushMicrotasks);
    expect(probeText()).toBe('no-session|checking');

    await act(async () => auth.changeSession('viajero-2'));
    await act(flushMicrotasks);
    expect(probeText()).toBe('viajero-2|accepted');

    await act(async () => auth.changeSession(null));
    expect(probeText()).toBe('no-session|checking');
  });

  test('un evento de sesión que llega antes de la lectura inicial gana', async () => {
    const auth = new FakeAuth();
    let resolver!: (id: string | null) => void;
    jest.spyOn(auth, 'currentUserId').mockReturnValue(new Promise((r) => (resolver = r)));
    await mount(auth);

    await act(async () => auth.changeSession(null));
    await act(async () => resolver('viajero-1'));
    await act(flushMicrotasks);

    expect(probeText()).toBe('no-session|checking');
  });
});

describe('ConsentProvider', () => {
  test('expone el estado del ConsentViewModel global', async () => {
    await mount(new FakeAuth({ consentResponses: [['tratamiento_datos']] }));
    await act(flushMicrotasks);
    expect(probeText()).toBe(`viajero-1|${ConsentState.pending}`);
  });

  test('al volver a primer plano reintenta si la verificación falló (DiversoApp.didChangeAppLifecycleState)', async () => {
    const auth = new FakeAuth({ consentResponses: [new Error('sin red'), []] });
    await mount(auth);
    await act(flushMicrotasks);
    expect(probeText()).toBe('viajero-1|error');

    await appState.goToBackgroundAndBack();
    await act(flushMicrotasks);

    expect(auth.consentQueries).toBe(2);
    expect(probeText()).toBe('viajero-1|accepted');
  });

  test('al volver a primer plano con el estado ya conocido no vuelve a consultar', async () => {
    const auth = new FakeAuth();
    await mount(auth);
    await act(flushMicrotasks);

    await appState.goToBackgroundAndBack();
    await act(flushMicrotasks);

    expect(auth.consentQueries).toBe(1);
  });

  test('al desmontar deja de escuchar la sesión y el ciclo de vida', async () => {
    const auth = new FakeAuth();
    const { unmount } = await mount(auth);
    await act(flushMicrotasks);
    expect(auth.listenerCount).toBeGreaterThan(0);

    await unmount();

    expect(auth.listenerCount).toBe(0);
    expect(appState.listenerCount).toBe(0);
  });
});
