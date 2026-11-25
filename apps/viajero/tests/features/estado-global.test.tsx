import { act, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { DependenciesProvider } from '@/composition';
import { SessionProvider, useSession } from '@/features/auth/view-models/SessionProvider';
import { ConsentimientoProvider, useConsentimiento } from '@/features/legal/view-models/ConsentimientoProvider';
import { EstadoConsentimiento } from '@/features/legal/view-models/consent-view-model';

import { controlarAppState } from '../support/app-state';
import { AuthFalso } from '../support/auth-falso';
import { esperar } from '../support/compuerta';
import { dependenciasDePrueba } from '../support/dependencias-de-prueba';

/**
 * Estados globales (los `ChangeNotifierProvider` raíz de Flutter): la sesión de Supabase y el
 * consentimiento, como Context providers que comparten todas las pantallas.
 */

function Sonda() {
  const sesion = useSession();
  const consentimiento = useConsentimiento();
  return (
    <Text testID="sonda">
      {sesion.loading ? 'cargando' : (sesion.userId ?? 'sin-sesion')}|{consentimiento.estado}
    </Text>
  );
}

async function montar(auth: AuthFalso) {
  const r = await render(
    <DependenciesProvider dependencias={dependenciasDePrueba({ auth })}>
      <SessionProvider>
        <ConsentimientoProvider>
          <Sonda />
        </ConsentimientoProvider>
      </SessionProvider>
    </DependenciesProvider>,
  );
  return r;
}

const sonda = () => screen.getByTestId('sonda').props.children.join('');

let appState: ReturnType<typeof controlarAppState>;
beforeEach(() => {
  appState = controlarAppState();
});
afterEach(() => appState.restaurar());

describe('SesionProvider', () => {
  test('mientras no se lee la sesión guardada está «cargando»; luego da el usuario', async () => {
    const auth = new AuthFalso();
    let resolver!: (id: string | null) => void;
    jest.spyOn(auth, 'currentUserId').mockReturnValue(new Promise((r) => (resolver = r)));
    await montar(auth);
    expect(sonda()).toBe('cargando|verificando');

    await act(async () => resolver('viajero-1'));
    await act(esperar);
    expect(sonda()).toMatch(/^viajero-1\|/);
  });

  test('sigue los cambios de sesión (entrar, cambiar de usuario, salir)', async () => {
    const auth = new AuthFalso({ usuario: null });
    await montar(auth);
    await act(esperar);
    expect(sonda()).toBe('sin-sesion|verificando');

    await act(async () => auth.cambiarSesion('viajero-2'));
    await act(esperar);
    expect(sonda()).toBe('viajero-2|aceptado');

    await act(async () => auth.cambiarSesion(null));
    expect(sonda()).toBe('sin-sesion|verificando');
  });

  test('un evento de sesión que llega antes de la lectura inicial gana', async () => {
    const auth = new AuthFalso();
    let resolver!: (id: string | null) => void;
    jest.spyOn(auth, 'currentUserId').mockReturnValue(new Promise((r) => (resolver = r)));
    await montar(auth);

    await act(async () => auth.cambiarSesion(null));
    await act(async () => resolver('viajero-1'));
    await act(esperar);

    expect(sonda()).toBe('sin-sesion|verificando');
  });
});

describe('ConsentimientoProvider', () => {
  test('expone el estado del ConsentViewModel global', async () => {
    await montar(new AuthFalso({ consultas: [['tratamiento_datos']] }));
    await act(esperar);
    expect(sonda()).toBe(`viajero-1|${EstadoConsentimiento.pendiente}`);
  });

  test('al volver a primer plano reintenta si la verificación falló (DiversoApp.didChangeAppLifecycleState)', async () => {
    const auth = new AuthFalso({ consultas: [new Error('sin red'), []] });
    await montar(auth);
    await act(esperar);
    expect(sonda()).toBe('viajero-1|error');

    await appState.irASegundoPlanoYVolver();
    await act(esperar);

    expect(auth.consultas).toBe(2);
    expect(sonda()).toBe('viajero-1|aceptado');
  });

  test('al volver a primer plano con el estado ya conocido no vuelve a consultar', async () => {
    const auth = new AuthFalso();
    await montar(auth);
    await act(esperar);

    await appState.irASegundoPlanoYVolver();
    await act(esperar);

    expect(auth.consultas).toBe(1);
  });

  test('al desmontar deja de escuchar la sesión y el ciclo de vida', async () => {
    const auth = new AuthFalso();
    const { unmount } = await montar(auth);
    await act(esperar);
    expect(auth.oyentes).toBeGreaterThan(0);

    await unmount();

    expect(auth.oyentes).toBe(0);
    expect(appState.oyentes).toBe(0);
  });
});
