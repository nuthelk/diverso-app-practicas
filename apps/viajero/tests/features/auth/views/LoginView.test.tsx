import { act, fireEvent, screen } from '@testing-library/react-native';
import { BackHandler, DeviceEventEmitter, Platform, StyleSheet } from 'react-native';

import { LoginView } from '@/features/auth/views/LoginView';

import { FakeAuth } from '../../../support/fake-auth';
import { testDependencies } from '../../../support/test-dependencies';
import { resetFakeRouter, fakeRouter } from '../../../support/fake-expo-router';
import { setWindowSize, renderScreen, restoreWindowSize } from '../../../support/render-screen';

jest.mock('expo-router', () => require('../../../support/fake-expo-router'));

/**
 * Pantalla de acceso: «Usar cuenta demo» solo existe cuando el flag lo permite (en la app,
 * `__DEV__`: las builds de producción no regalan la clave de la cuenta de pruebas), entrar y
 * crear cuenta pasan por el view model. Sin red ni Supabase. Port 1:1 de `login_view_test.dart`
 * (+ enlaces legales y diseño ancho).
 */

async function renderLogin({ demoAccount, auth = new FakeAuth() }: { demoAccount?: boolean; auth?: FakeAuth } = {}) {
  await setWindowSize(420, 1000);
  await renderScreen(<LoginView showDemoAccount={demoAccount} />, { dependencies: testDependencies({ auth }) });
  return auth;
}

const typeInto = (label: string, text: string) => fireEvent.changeText(screen.getByLabelText(label), text);
const tap = (text: string) => fireEvent.press(screen.getByText(text));

beforeEach(resetFakeRouter);
afterEach(restoreWindowSize);

describe('bug A: «Usar cuenta demo»', () => {
  test('con el flag apagado (producción) el botón no existe', async () => {
    await renderLogin({ demoAccount: false });

    expect(screen.queryByText('Usar cuenta demo')).toBeNull();
    expect(screen.getByText('Entrar')).toBeOnTheScreen();
  });

  test('con el flag encendido (desarrollo) rellena el correo y la clave de la cuenta demo', async () => {
    await renderLogin({ demoAccount: true });

    expect(screen.getByText('Usar cuenta demo')).toBeOnTheScreen();
    await tap('Usar cuenta demo');

    expect(screen.getByLabelText('Correo').props.value).toBe('viajero@demo.com');
    expect(screen.getByLabelText('Contraseña').props.value).toBe('demo1234');
  });

  test('por defecto sigue a __DEV__', async () => {
    await renderLogin();
    expect(screen.getByText('Usar cuenta demo')).toBeOnTheScreen();
  });

  test('al pasar a «Crear cuenta nueva» el botón demo desaparece', async () => {
    await renderLogin({ demoAccount: true });

    await tap('Crear cuenta nueva');

    expect(screen.queryByText('Usar cuenta demo')).toBeNull();
  });
});

describe('entrar y crear cuenta', () => {
  test('entrar con datos válidos llama a signIn con el correo recortado', async () => {
    const auth = await renderLogin({ demoAccount: false });

    await typeInto('Correo', ' ana@correo.test ');
    await typeInto('Contraseña', 'secreto1');
    await tap('Entrar');

    expect(auth.signIns).toEqual([{ email: 'ana@correo.test', password: 'secreto1' }]);
  });

  test('datos inválidos muestran los avisos del formulario y no llaman a nada', async () => {
    const auth = await renderLogin({ demoAccount: false });

    await tap('Entrar');

    expect(screen.getByText('Correo inválido')).toBeOnTheScreen();
    expect(screen.getByText('Mínimo 6 caracteres')).toBeOnTheScreen();
    expect(auth.signIns).toEqual([]);
  });

  test('credenciales rechazadas: se ve el mensaje y el botón vuelve a estar activo', async () => {
    const auth = new FakeAuth();
    auth.signInFailure = new Error('Invalid login credentials');
    await renderLogin({ demoAccount: false, auth });

    await typeInto('Correo', 'ana@correo.test');
    await typeInto('Contraseña', 'secreto1');
    await tap('Entrar');
    await act(async () => {});

    expect(screen.getByText('Correo o contraseña incorrectos, o no hay conexión.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeEnabled();
  });

  test('crear cuenta sin marcar las casillas no registra y las resalta', async () => {
    const auth = await renderLogin({ demoAccount: false });

    await tap('Crear cuenta nueva');
    await typeInto('Tu nombre', 'Ana');
    await typeInto('Correo', 'ana@correo.test');
    await typeInto('Contraseña', 'secreto1');
    await tap('Crear cuenta');

    expect(auth.signUps).toEqual([]);
    expect(screen.getByText('Debes aceptar ambos documentos para crear tu cuenta.')).toBeOnTheScreen();
  });

  test('crear cuenta con las dos casillas registra con autorización expresa', async () => {
    const auth = await renderLogin({ demoAccount: false });

    await tap('Crear cuenta nueva');
    await typeInto('Tu nombre', 'Ana');
    await typeInto('Correo', 'ana@correo.test');
    await typeInto('Contraseña', 'secreto1');
    for (const checkbox of screen.getAllByRole('checkbox')) await fireEvent.press(checkbox);
    await tap('Crear cuenta');

    expect(auth.signUps).toEqual([
      { name: 'Ana', email: 'ana@correo.test', password: 'secreto1', acceptsDocuments: true },
    ]);
  });

  test('un nombre de menos de 2 letras avisa «Escribe tu nombre»', async () => {
    await renderLogin({ demoAccount: false });
    await tap('Crear cuenta nueva');
    await typeInto('Tu nombre', ' A ');
    await tap('Crear cuenta');
    expect(screen.getByText('Escribe tu nombre')).toBeOnTheScreen();
  });
});

describe('textos y enlaces', () => {
  test('entrar no lleva título (solo el colibrí y la frase); crear cuenta sí, para marcar el cambio de modo', async () => {
    await renderLogin({ demoAccount: false });
    expect(screen.queryByText('Bienvenido de vuelta')).toBeNull();
    expect(screen.queryByRole('header')).toBeNull();
    expect(screen.getByText('Entra para seguir explorando Antioquia.')).toBeOnTheScreen();

    await tap('Crear cuenta nueva');

    expect(screen.getByText('Crea tu cuenta')).toBeOnTheScreen();
    expect(screen.getByText('Explora y reserva planes de agencias verificadas.')).toBeOnTheScreen();
    expect(screen.getByText('Ya tengo cuenta — entrar')).toBeOnTheScreen();
  });

  test('el pie abre la política de datos y los términos', async () => {
    await renderLogin({ demoAccount: false });
    await tap('Política de datos');
    await tap('Términos y condiciones');
    expect(fakeRouter.push.mock.calls).toEqual([['/legal/privacidad'], ['/legal/terminos-viajeros']]);
  });

  test('el logo es solo el colibrí, centrado y sin la palabra «Diverso»; en pantallas anchas pasa al panel', async () => {
    const tagline =
      'Planes turísticos de agencias antioqueñas verificadas. Precio final desde el inicio, cupos reales y pago protegido.';
    await renderLogin({ demoAccount: false });
    // Angosta: el colibrí grande, sin caja ni nombre, centrado; la promesa no.
    expect(screen.getByTestId('welcome-hummingbird')).toBeOnTheScreen();
    expect(StyleSheet.flatten(screen.getByTestId('login-brand').props.style).alignItems).toBe('center');
    expect(screen.queryByText('Diverso')).toBeNull();
    expect(screen.queryByText(tagline)).toBeNull();

    await setWindowSize(1024, 800);

    expect(screen.getByTestId('brand-panel')).toBeOnTheScreen();
    expect(screen.getByText(tagline)).toBeOnTheScreen();
    expect(screen.queryByText('Diverso')).toBeNull();
    expect(screen.getAllByTestId('diverso-logo', { includeHiddenElements: true })).toHaveLength(1);
  });
});

describe('contraseña', () => {
  test('el ojo muestra y oculta la contraseña', async () => {
    await renderLogin({ demoAccount: false });
    expect(screen.getByLabelText('Contraseña').props.secureTextEntry).toBe(true);

    await fireEvent.press(screen.getByRole('button', { name: 'Mostrar contraseña' }));
    expect(screen.getByLabelText('Contraseña').props.secureTextEntry).toBe(false);

    await fireEvent.press(screen.getByRole('button', { name: 'Ocultar contraseña' }));
    expect(screen.getByLabelText('Contraseña').props.secureTextEntry).toBe(true);
  });
});

describe('avisos de los campos', () => {
  test('antes del primer envío escribir no muestra avisos', async () => {
    await renderLogin({ demoAccount: false });

    await typeInto('Correo', 'ana');
    await typeInto('Contraseña', '12');

    expect(screen.queryByText('Correo inválido')).toBeNull();
    expect(screen.queryByText('Mínimo 6 caracteres')).toBeNull();
  });

  test('tras un envío fallido, corregir un campo quita su aviso (y romperlo lo vuelve a mostrar)', async () => {
    await renderLogin({ demoAccount: false });
    await tap('Entrar');
    expect(screen.getByText('Correo inválido')).toBeOnTheScreen();

    await typeInto('Correo', 'ana@correo.test');

    expect(screen.queryByText('Correo inválido')).toBeNull();
    expect(screen.getByText('Mínimo 6 caracteres')).toBeOnTheScreen();

    await typeInto('Contraseña', 'secreto1');
    expect(screen.queryByText('Mínimo 6 caracteres')).toBeNull();

    await typeInto('Correo', 'ana');
    expect(screen.getByText('Correo inválido')).toBeOnTheScreen();
  });

  test('tras un envío fallido, «Usar cuenta demo» rellena y quita los avisos', async () => {
    await renderLogin({ demoAccount: true });
    await tap('Entrar');
    expect(screen.getByText('Correo inválido')).toBeOnTheScreen();

    await tap('Usar cuenta demo');

    expect(screen.queryByText('Correo inválido')).toBeNull();
    expect(screen.queryByText('Mínimo 6 caracteres')).toBeNull();
  });

  test('cambiar entre «Entrar» y «Crear cuenta» limpia los avisos del intento anterior', async () => {
    await renderLogin({ demoAccount: false });
    await tap('Entrar');
    expect(screen.getByText('Correo inválido')).toBeOnTheScreen();

    await tap('Crear cuenta nueva');

    expect(screen.queryByText('Correo inválido')).toBeNull();
    expect(screen.queryByText('Mínimo 6 caracteres')).toBeNull();

    await tap('Crear cuenta');
    expect(screen.getByText('Escribe tu nombre')).toBeOnTheScreen();

    await tap('Ya tengo cuenta — entrar');

    expect(screen.queryByText('Escribe tu nombre')).toBeNull();
    expect(screen.queryByText('Correo inválido')).toBeNull();
  });

  test('tras cambiar de modo, escribir vuelve a no mostrar avisos hasta el próximo envío', async () => {
    await renderLogin({ demoAccount: false });
    await tap('Entrar');
    await tap('Crear cuenta nueva');

    await typeInto('Correo', 'ana');

    expect(screen.queryByText('Correo inválido')).toBeNull();
  });
});

describe('atrás del sistema (Android)', () => {
  // «Crea tu cuenta» es un modo de la misma pantalla: sin esto el atrás cerraría la app.
  type Listener = Parameters<typeof BackHandler.addEventListener>[1];
  let listeners: Listener[] = [];
  let spy: jest.SpyInstance;
  beforeEach(() => {
    listeners = [];
    spy = jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, listener) => {
      listeners.push(listener);
      return { remove: () => void listeners.splice(listeners.indexOf(listener), 1) };
    });
  });
  afterEach(() => spy.mockRestore());

  /** Lo que hace Android: avisa a las escuchas de la más nueva a la más vieja hasta que una lo consume. */
  const pressBack = async () => {
    let consumed = false;
    await act(async () => {
      consumed = [...listeners].reverse().some((e) => (e as () => unknown)() === true);
    });
    return consumed;
  };

  test('en «Crea tu cuenta» vuelve a «Entrar» en vez de cerrar la app', async () => {
    await renderLogin({ demoAccount: false });
    await tap('Crear cuenta nueva');
    expect(screen.getByText('Crea tu cuenta')).toBeOnTheScreen();

    expect(await pressBack()).toBe(true);

    expect(screen.queryByText('Crea tu cuenta')).toBeNull();
    expect(screen.getByText('Crear cuenta nueva')).toBeOnTheScreen();
    expect(screen.getByText('Entrar')).toBeOnTheScreen();
  });

  test('en «Entrar» no lo intercepta: el sistema hace lo de siempre', async () => {
    await renderLogin({ demoAccount: false });
    expect(await pressBack()).toBe(false);

    // Tras ir y volver de «Crea tu cuenta» tampoco queda ninguna escucha que lo consuma.
    await tap('Crear cuenta nueva');
    await tap('Ya tengo cuenta — entrar');
    expect(await pressBack()).toBe(false);
  });
});

describe('teclado', () => {
  // Expo SDK 58: Android es edge-to-edge y la ventana ya no se achica con el teclado; sin
  // `behavior` el teclado taparía «Entrar» también en Android.
  test.each([
    ['ios', 'keyboardWillShow'],
    ['android', 'keyboardDidShow'],
  ] as const)('en %s el formulario deja sitio al teclado (relleno inferior)', async (os, event) => {
    const original = Platform.OS;
    Object.defineProperty(Platform, 'OS', { configurable: true, get: () => os });
    try {
      await renderLogin({ demoAccount: false });
      const container = screen.getByTestId('login-keyboard');
      await fireEvent(container, 'layout', {
        persist: () => {},
        nativeEvent: { layout: { x: 0, y: 0, width: 420, height: 1000 } },
      });

      await act(async () => {
        DeviceEventEmitter.emit(event, {
          duration: 0,
          easing: 'keyboard',
          endCoordinates: { screenX: 0, screenY: 700, width: 420, height: 300 },
        });
      });

      expect(StyleSheet.flatten(screen.getByTestId('login-keyboard').props.style).paddingBottom).toBe(300);
    } finally {
      Object.defineProperty(Platform, 'OS', { configurable: true, get: () => original });
    }
  });
});
