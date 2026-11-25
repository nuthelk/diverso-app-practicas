import { act, fireEvent, screen } from '@testing-library/react-native';
import { BackHandler, DeviceEventEmitter, Platform, StyleSheet } from 'react-native';

import { LoginView } from '@/features/auth/views/LoginView';

import { AuthFalso } from '../../../support/auth-falso';
import { dependenciasDePrueba } from '../../../support/dependencias-de-prueba';
import { reiniciarRouterFalso, routerFalso } from '../../../support/expo-router-falso';
import { fijarVentana, renderPantalla, restaurarVentana } from '../../../support/pantalla';

jest.mock('expo-router', () => require('../../../support/expo-router-falso'));

/**
 * Pantalla de acceso: «Usar cuenta demo» solo existe cuando el flag lo permite (en la app,
 * `__DEV__`: las builds de producción no regalan la clave de la cuenta de pruebas), entrar y
 * crear cuenta pasan por el view model. Sin red ni Supabase. Port 1:1 de `login_view_test.dart`
 * (+ enlaces legales y diseño ancho).
 */

async function abrir({ cuentaDemo, auth = new AuthFalso() }: { cuentaDemo?: boolean; auth?: AuthFalso } = {}) {
  await fijarVentana(420, 1000);
  await renderPantalla(<LoginView mostrarCuentaDemo={cuentaDemo} />, { dependencias: dependenciasDePrueba({ auth }) });
  return auth;
}

const escribir = (etiqueta: string, texto: string) => fireEvent.changeText(screen.getByLabelText(etiqueta), texto);
const tocar = (texto: string) => fireEvent.press(screen.getByText(texto));

beforeEach(reiniciarRouterFalso);
afterEach(restaurarVentana);

describe('bug A: «Usar cuenta demo»', () => {
  test('con el flag apagado (producción) el botón no existe', async () => {
    await abrir({ cuentaDemo: false });

    expect(screen.queryByText('Usar cuenta demo')).toBeNull();
    expect(screen.getByText('Entrar')).toBeOnTheScreen();
  });

  test('con el flag encendido (desarrollo) rellena el correo y la clave de la cuenta demo', async () => {
    await abrir({ cuentaDemo: true });

    expect(screen.getByText('Usar cuenta demo')).toBeOnTheScreen();
    await tocar('Usar cuenta demo');

    expect(screen.getByLabelText('Correo').props.value).toBe('viajero@demo.com');
    expect(screen.getByLabelText('Contraseña').props.value).toBe('demo1234');
  });

  test('por defecto sigue a __DEV__', async () => {
    await abrir();
    expect(screen.getByText('Usar cuenta demo')).toBeOnTheScreen();
  });

  test('al pasar a «Crear cuenta nueva» el botón demo desaparece', async () => {
    await abrir({ cuentaDemo: true });

    await tocar('Crear cuenta nueva');

    expect(screen.queryByText('Usar cuenta demo')).toBeNull();
  });
});

describe('entrar y crear cuenta', () => {
  test('entrar con datos válidos llama a signIn con el correo recortado', async () => {
    const auth = await abrir({ cuentaDemo: false });

    await escribir('Correo', ' ana@correo.test ');
    await escribir('Contraseña', 'secreto1');
    await tocar('Entrar');

    expect(auth.entradas).toEqual([{ email: 'ana@correo.test', password: 'secreto1' }]);
  });

  test('datos inválidos muestran los avisos del formulario y no llaman a nada', async () => {
    const auth = await abrir({ cuentaDemo: false });

    await tocar('Entrar');

    expect(screen.getByText('Correo inválido')).toBeOnTheScreen();
    expect(screen.getByText('Mínimo 6 caracteres')).toBeOnTheScreen();
    expect(auth.entradas).toEqual([]);
  });

  test('credenciales rechazadas: se ve el mensaje y el botón vuelve a estar activo', async () => {
    const auth = new AuthFalso();
    auth.falloAlEntrar = new Error('Invalid login credentials');
    await abrir({ cuentaDemo: false, auth });

    await escribir('Correo', 'ana@correo.test');
    await escribir('Contraseña', 'secreto1');
    await tocar('Entrar');
    await act(async () => {});

    expect(screen.getByText('Correo o contraseña incorrectos, o no hay conexión.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeEnabled();
  });

  test('crear cuenta sin marcar las casillas no registra y las resalta', async () => {
    const auth = await abrir({ cuentaDemo: false });

    await tocar('Crear cuenta nueva');
    await escribir('Tu nombre', 'Ana');
    await escribir('Correo', 'ana@correo.test');
    await escribir('Contraseña', 'secreto1');
    await tocar('Crear cuenta');

    expect(auth.registros).toEqual([]);
    expect(screen.getByText('Debes aceptar ambos documentos para crear tu cuenta.')).toBeOnTheScreen();
  });

  test('crear cuenta con las dos casillas registra con autorización expresa', async () => {
    const auth = await abrir({ cuentaDemo: false });

    await tocar('Crear cuenta nueva');
    await escribir('Tu nombre', 'Ana');
    await escribir('Correo', 'ana@correo.test');
    await escribir('Contraseña', 'secreto1');
    for (const casilla of screen.getAllByRole('checkbox')) await fireEvent.press(casilla);
    await tocar('Crear cuenta');

    expect(auth.registros).toEqual([
      { name: 'Ana', email: 'ana@correo.test', password: 'secreto1', acceptsDocuments: true },
    ]);
  });

  test('un nombre de menos de 2 letras avisa «Escribe tu nombre»', async () => {
    await abrir({ cuentaDemo: false });
    await tocar('Crear cuenta nueva');
    await escribir('Tu nombre', ' A ');
    await tocar('Crear cuenta');
    expect(screen.getByText('Escribe tu nombre')).toBeOnTheScreen();
  });
});

describe('textos y enlaces', () => {
  test('entrar no lleva título (solo el colibrí y la frase); crear cuenta sí, para marcar el cambio de modo', async () => {
    await abrir({ cuentaDemo: false });
    expect(screen.queryByText('Bienvenido de vuelta')).toBeNull();
    expect(screen.queryByRole('header')).toBeNull();
    expect(screen.getByText('Entra para seguir explorando Antioquia.')).toBeOnTheScreen();

    await tocar('Crear cuenta nueva');

    expect(screen.getByText('Crea tu cuenta')).toBeOnTheScreen();
    expect(screen.getByText('Explora y reserva planes de agencias verificadas.')).toBeOnTheScreen();
    expect(screen.getByText('Ya tengo cuenta — entrar')).toBeOnTheScreen();
  });

  test('el pie abre la política de datos y los términos', async () => {
    await abrir({ cuentaDemo: false });
    await tocar('Política de datos');
    await tocar('Términos y condiciones');
    expect(routerFalso.push.mock.calls).toEqual([['/legal/privacidad'], ['/legal/terminos-viajeros']]);
  });

  test('el logo es solo el colibrí, centrado y sin la palabra «Diverso»; en pantallas anchas pasa al panel', async () => {
    const promesa =
      'Planes turísticos de agencias antioqueñas verificadas. Precio final desde el inicio, cupos reales y pago protegido.';
    await abrir({ cuentaDemo: false });
    // Angosta: el colibrí grande, sin caja ni nombre, centrado; la promesa no.
    expect(screen.getByTestId('colibri-bienvenida')).toBeOnTheScreen();
    expect(StyleSheet.flatten(screen.getByTestId('marca-login').props.style).alignItems).toBe('center');
    expect(screen.queryByText('Diverso')).toBeNull();
    expect(screen.queryByText(promesa)).toBeNull();

    await fijarVentana(1024, 800);

    expect(screen.getByTestId('panel-marca')).toBeOnTheScreen();
    expect(screen.getByText(promesa)).toBeOnTheScreen();
    expect(screen.queryByText('Diverso')).toBeNull();
    expect(screen.getAllByTestId('diverso-logo', { includeHiddenElements: true })).toHaveLength(1);
  });
});

describe('contraseña', () => {
  test('el ojo muestra y oculta la contraseña', async () => {
    await abrir({ cuentaDemo: false });
    expect(screen.getByLabelText('Contraseña').props.secureTextEntry).toBe(true);

    await fireEvent.press(screen.getByRole('button', { name: 'Mostrar contraseña' }));
    expect(screen.getByLabelText('Contraseña').props.secureTextEntry).toBe(false);

    await fireEvent.press(screen.getByRole('button', { name: 'Ocultar contraseña' }));
    expect(screen.getByLabelText('Contraseña').props.secureTextEntry).toBe(true);
  });
});

describe('avisos de los campos', () => {
  test('antes del primer envío escribir no muestra avisos', async () => {
    await abrir({ cuentaDemo: false });

    await escribir('Correo', 'ana');
    await escribir('Contraseña', '12');

    expect(screen.queryByText('Correo inválido')).toBeNull();
    expect(screen.queryByText('Mínimo 6 caracteres')).toBeNull();
  });

  test('tras un envío fallido, corregir un campo quita su aviso (y romperlo lo vuelve a mostrar)', async () => {
    await abrir({ cuentaDemo: false });
    await tocar('Entrar');
    expect(screen.getByText('Correo inválido')).toBeOnTheScreen();

    await escribir('Correo', 'ana@correo.test');

    expect(screen.queryByText('Correo inválido')).toBeNull();
    expect(screen.getByText('Mínimo 6 caracteres')).toBeOnTheScreen();

    await escribir('Contraseña', 'secreto1');
    expect(screen.queryByText('Mínimo 6 caracteres')).toBeNull();

    await escribir('Correo', 'ana');
    expect(screen.getByText('Correo inválido')).toBeOnTheScreen();
  });

  test('tras un envío fallido, «Usar cuenta demo» rellena y quita los avisos', async () => {
    await abrir({ cuentaDemo: true });
    await tocar('Entrar');
    expect(screen.getByText('Correo inválido')).toBeOnTheScreen();

    await tocar('Usar cuenta demo');

    expect(screen.queryByText('Correo inválido')).toBeNull();
    expect(screen.queryByText('Mínimo 6 caracteres')).toBeNull();
  });

  test('cambiar entre «Entrar» y «Crear cuenta» limpia los avisos del intento anterior', async () => {
    await abrir({ cuentaDemo: false });
    await tocar('Entrar');
    expect(screen.getByText('Correo inválido')).toBeOnTheScreen();

    await tocar('Crear cuenta nueva');

    expect(screen.queryByText('Correo inválido')).toBeNull();
    expect(screen.queryByText('Mínimo 6 caracteres')).toBeNull();

    await tocar('Crear cuenta');
    expect(screen.getByText('Escribe tu nombre')).toBeOnTheScreen();

    await tocar('Ya tengo cuenta — entrar');

    expect(screen.queryByText('Escribe tu nombre')).toBeNull();
    expect(screen.queryByText('Correo inválido')).toBeNull();
  });

  test('tras cambiar de modo, escribir vuelve a no mostrar avisos hasta el próximo envío', async () => {
    await abrir({ cuentaDemo: false });
    await tocar('Entrar');
    await tocar('Crear cuenta nueva');

    await escribir('Correo', 'ana');

    expect(screen.queryByText('Correo inválido')).toBeNull();
  });
});

describe('atrás del sistema (Android)', () => {
  // «Crea tu cuenta» es un modo de la misma pantalla: sin esto el atrás cerraría la app.
  type Escucha = Parameters<typeof BackHandler.addEventListener>[1];
  let escuchas: Escucha[] = [];
  let espia: jest.SpyInstance;
  beforeEach(() => {
    escuchas = [];
    espia = jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_evento, escucha) => {
      escuchas.push(escucha);
      return { remove: () => void escuchas.splice(escuchas.indexOf(escucha), 1) };
    });
  });
  afterEach(() => espia.mockRestore());

  /** Lo que hace Android: avisa a las escuchas de la más nueva a la más vieja hasta que una lo consume. */
  const atras = async () => {
    let consumido = false;
    await act(async () => {
      consumido = [...escuchas].reverse().some((e) => (e as () => unknown)() === true);
    });
    return consumido;
  };

  test('en «Crea tu cuenta» vuelve a «Entrar» en vez de cerrar la app', async () => {
    await abrir({ cuentaDemo: false });
    await tocar('Crear cuenta nueva');
    expect(screen.getByText('Crea tu cuenta')).toBeOnTheScreen();

    expect(await atras()).toBe(true);

    expect(screen.queryByText('Crea tu cuenta')).toBeNull();
    expect(screen.getByText('Crear cuenta nueva')).toBeOnTheScreen();
    expect(screen.getByText('Entrar')).toBeOnTheScreen();
  });

  test('en «Entrar» no lo intercepta: el sistema hace lo de siempre', async () => {
    await abrir({ cuentaDemo: false });
    expect(await atras()).toBe(false);

    // Tras ir y volver de «Crea tu cuenta» tampoco queda ninguna escucha que lo consuma.
    await tocar('Crear cuenta nueva');
    await tocar('Ya tengo cuenta — entrar');
    expect(await atras()).toBe(false);
  });
});

describe('teclado', () => {
  // Expo SDK 58: Android es edge-to-edge y la ventana ya no se achica con el teclado; sin
  // `behavior` el teclado taparía «Entrar» también en Android.
  test.each([
    ['ios', 'keyboardWillShow'],
    ['android', 'keyboardDidShow'],
  ] as const)('en %s el formulario deja sitio al teclado (relleno inferior)', async (so, evento) => {
    const original = Platform.OS;
    Object.defineProperty(Platform, 'OS', { configurable: true, get: () => so });
    try {
      await abrir({ cuentaDemo: false });
      const contenedor = screen.getByTestId('teclado-login');
      await fireEvent(contenedor, 'layout', {
        persist: () => {},
        nativeEvent: { layout: { x: 0, y: 0, width: 420, height: 1000 } },
      });

      await act(async () => {
        DeviceEventEmitter.emit(evento, {
          duration: 0,
          easing: 'keyboard',
          endCoordinates: { screenX: 0, screenY: 700, width: 420, height: 300 },
        });
      });

      expect(StyleSheet.flatten(screen.getByTestId('teclado-login').props.style).paddingBottom).toBe(300);
    } finally {
      Object.defineProperty(Platform, 'OS', { configurable: true, get: () => original });
    }
  });
});
