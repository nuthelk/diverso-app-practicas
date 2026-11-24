import { act, renderHook } from '@testing-library/react-native';

import { CLAVE_DEMO, CORREO_DEMO, useLoginViewModel } from '@/features/auth/view-models/useLoginViewModel';

import { AuthFalso } from '../../../support/auth-falso';
import { compuerta } from '../../../support/compuerta';

/**
 * `useLoginViewModel` con un `AuthFalso`: entrar, crear cuenta con autorización expresa, errores
 * con el mismo texto de siempre, cuenta demo solo si el flag lo permite y protección tras
 * desmontar. Port 1:1 de `login_view_model_test.dart`.
 */

let auth: AuthFalso;
beforeEach(() => {
  auth = new AuthFalso();
});

async function crear({ cuentaDemo }: { cuentaDemo?: boolean } = {}) {
  const cargandos: boolean[] = [];
  const r = await renderHook(() => {
    const vm = useLoginViewModel({ auth, cuentaDemo });
    if (cargandos[cargandos.length - 1] !== vm.cargando) cargandos.push(vm.cargando);
    return vm;
  });
  return { ...r, cargandos };
}

type Vm = ReturnType<typeof useLoginViewModel>;

function enviar(
  vm: Vm,
  { valido = true, nombre = '  Ana  ', email = ' ana@correo.test ' }: { valido?: boolean; nombre?: string; email?: string } = {},
) {
  return act(() => vm.enviar({ formularioValido: valido, nombre, email, password: 'secreto' }));
}

describe('estado inicial', () => {
  test('entrar, sin cargar, sin error y sin casillas marcadas', async () => {
    const { result } = await crear();
    expect(result.current.esRegistro).toBe(false);
    expect(result.current.cargando).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.aceptaDatos).toBe(false);
    expect(result.current.aceptaTerminos).toBe(false);
    expect(result.current.intentoRegistro).toBe(false);
  });

  test('alternarModo cambia entre entrar y crear cuenta y limpia error e intento', async () => {
    const { result } = await crear();
    await act(() => result.current.alternarModo());
    expect(result.current.esRegistro).toBe(true);

    await enviar(result.current);
    expect(result.current.intentoRegistro).toBe(true);

    await act(() => result.current.alternarModo());
    expect(result.current.esRegistro).toBe(false);
    expect(result.current.intentoRegistro).toBe(false);
    expect(result.current.error).toBeNull();
  });
});

describe('entrar', () => {
  test('con datos válidos llama a signIn con el correo recortado', async () => {
    const { result } = await crear();
    await enviar(result.current);

    expect(auth.entradas).toEqual([{ email: 'ana@correo.test', password: 'secreto' }]);
    expect(result.current.cargando).toBe(false);
    expect(result.current.error).toBeNull();
  });

  test('con el formulario inválido no llama a nada', async () => {
    const { result } = await crear();
    await enviar(result.current, { valido: false });

    expect(auth.entradas).toEqual([]);
    expect(result.current.cargando).toBe(false);
  });

  test('cargando mientras responde y un segundo envío no repite la petición', async () => {
    auth.compuerta = compuerta();
    const { result, cargandos } = await crear();
    const vm = result.current;

    let primero!: Promise<void>;
    await act(async () => {
      primero = vm.enviar({ formularioValido: true, nombre: '', email: 'ana@correo.test', password: 'secreto' });
    });
    expect(result.current.cargando).toBe(true);
    // Incluso con el `vm` de antes del render (cierre viejo) el segundo envío se ignora.
    await enviar(vm);

    auth.compuerta.completar();
    await act(() => primero);

    expect(cargandos).toEqual([false, true, false]);
    expect(auth.entradas).toHaveLength(1);
  });

  test('credenciales rechazadas: mensaje de siempre y el botón se libera', async () => {
    auth.falloAlEntrar = new Error('Invalid login credentials');
    const { result } = await crear();
    await enviar(result.current);

    expect(result.current.error).toBe('Correo o contraseña incorrectos, o no hay conexión.');
    expect(result.current.cargando).toBe(false);
  });

  test('un nuevo intento limpia el error anterior', async () => {
    auth.falloAlEntrar = new Error('x');
    const { result } = await crear();
    await enviar(result.current);
    auth.falloAlEntrar = null;

    await enviar(result.current);

    expect(result.current.error).toBeNull();
  });
});

describe('crear cuenta', () => {
  test('sin las dos casillas no se envía nada, pero se marca el intento', async () => {
    const { result } = await crear();
    await act(() => result.current.alternarModo());
    await act(() => result.current.cambiarAceptaDatos(true));

    await enviar(result.current);

    expect(auth.registros).toEqual([]);
    expect(result.current.intentoRegistro).toBe(true);
    expect(result.current.cargando).toBe(false);
  });

  test('con las dos casillas y el formulario válido registra con autorización expresa', async () => {
    const { result } = await crear();
    await act(() => result.current.alternarModo());
    await act(() => result.current.cambiarAceptaDatos(true));
    await act(() => result.current.cambiarAceptaTerminos(true));

    await enviar(result.current);

    expect(auth.registros).toEqual([
      { nombre: 'Ana', email: 'ana@correo.test', password: 'secreto', aceptaDocumentos: true },
    ]);
    expect(result.current.error).toBeNull();
  });

  test('con las casillas pero el formulario inválido tampoco registra', async () => {
    const { result } = await crear();
    await act(() => result.current.alternarModo());
    await act(() => result.current.cambiarAceptaDatos(true));
    await act(() => result.current.cambiarAceptaTerminos(true));

    await enviar(result.current, { valido: false });

    expect(auth.registros).toEqual([]);
  });

  test('si falla (correo ya registrado) muestra el mensaje de registro', async () => {
    auth.falloAlEntrar = new Error('User already registered');
    const { result } = await crear();
    await act(() => result.current.alternarModo());
    await act(() => result.current.cambiarAceptaDatos(true));
    await act(() => result.current.cambiarAceptaTerminos(true));

    await enviar(result.current);

    expect(result.current.error).toBe('No pudimos crear la cuenta. ¿Ese correo ya está registrado?');
    expect(result.current.cargando).toBe(false);
  });
});

describe('cuenta demo (bug A)', () => {
  test('con el flag apagado (release) nunca se ofrece, ni al entrar ni al registrarse', async () => {
    const { result } = await crear({ cuentaDemo: false });
    expect(result.current.ofreceCuentaDemo).toBe(false);
    await act(() => result.current.alternarModo());
    expect(result.current.ofreceCuentaDemo).toBe(false);
  });

  test('con el flag encendido (debug) se ofrece solo al entrar', async () => {
    const { result } = await crear({ cuentaDemo: true });
    expect(result.current.ofreceCuentaDemo).toBe(true);
    await act(() => result.current.alternarModo());
    expect(result.current.ofreceCuentaDemo).toBe(false);
  });

  test('por defecto sigue a __DEV__ (las pruebas corren en desarrollo)', async () => {
    expect(__DEV__).toBe(true);
    const { result } = await crear();
    expect(result.current.ofreceCuentaDemo).toBe(true);
  });

  test('las credenciales son las de la cuenta de pruebas del seed', () => {
    expect(CORREO_DEMO).toBe('viajero@demo.com');
    expect(CLAVE_DEMO).toBe('demo1234');
  });
});

test('desmontar: una respuesta que llega después no avisa a nadie ni lanza', async () => {
  auth.compuerta = compuerta();
  const { result, unmount } = await crear();
  let envio!: Promise<void>;
  await act(async () => {
    envio = result.current.enviar({ formularioValido: true, nombre: '', email: 'a@b.c', password: 'secreto' });
  });
  await unmount();
  auth.compuerta.completar();

  await expect(envio).resolves.toBeUndefined();
});
