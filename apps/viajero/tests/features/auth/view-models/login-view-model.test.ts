import { act, renderHook } from '@testing-library/react-native';

import { DEMO_PASSWORD, DEMO_EMAIL, useLoginViewModel } from '@/features/auth/view-models/useLoginViewModel';

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

async function setup({ demoAccount }: { demoAccount?: boolean } = {}) {
  const loadingStates: boolean[] = [];
  const r = await renderHook(() => {
    const vm = useLoginViewModel({ auth, demoAccount });
    if (loadingStates[loadingStates.length - 1] !== vm.loading) loadingStates.push(vm.loading);
    return vm;
  });
  return { ...r, loadingStates };
}

type Vm = ReturnType<typeof useLoginViewModel>;

function submit(
  vm: Vm,
  { valid = true, name = '  Ana  ', email = ' ana@correo.test ' }: { valid?: boolean; name?: string; email?: string } = {},
) {
  return act(() => vm.submit({ isFormValid: valid, name, email, password: 'secreto' }));
}

describe('estado inicial', () => {
  test('entrar, sin cargar, sin error y sin casillas marcadas', async () => {
    const { result } = await setup();
    expect(result.current.isSignUp).toBe(false);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.acceptsDataPolicy).toBe(false);
    expect(result.current.acceptsTerms).toBe(false);
    expect(result.current.signUpAttempted).toBe(false);
  });

  test('alternarModo cambia entre entrar y crear cuenta y limpia error e intento', async () => {
    const { result } = await setup();
    await act(() => result.current.toggleMode());
    expect(result.current.isSignUp).toBe(true);

    await submit(result.current);
    expect(result.current.signUpAttempted).toBe(true);

    await act(() => result.current.toggleMode());
    expect(result.current.isSignUp).toBe(false);
    expect(result.current.signUpAttempted).toBe(false);
    expect(result.current.error).toBeNull();
  });
});

describe('entrar', () => {
  test('con datos válidos llama a signIn con el correo recortado', async () => {
    const { result } = await setup();
    await submit(result.current);

    expect(auth.entradas).toEqual([{ email: 'ana@correo.test', password: 'secreto' }]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  test('con el formulario inválido no llama a nada', async () => {
    const { result } = await setup();
    await submit(result.current, { valid: false });

    expect(auth.entradas).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  test('cargando mientras responde y un segundo envío no repite la petición', async () => {
    auth.compuerta = compuerta();
    const { result, loadingStates } = await setup();
    const vm = result.current;

    let first!: Promise<void>;
    await act(async () => {
      first = vm.submit({ isFormValid: true, name: '', email: 'ana@correo.test', password: 'secreto' });
    });
    expect(result.current.loading).toBe(true);
    // Incluso con el `vm` de antes del render (cierre viejo) el segundo envío se ignora.
    await submit(vm);

    auth.compuerta.completar();
    await act(() => first);

    expect(loadingStates).toEqual([false, true, false]);
    expect(auth.entradas).toHaveLength(1);
  });

  test('credenciales rechazadas: mensaje de siempre y el botón se libera', async () => {
    auth.falloAlEntrar = new Error('Invalid login credentials');
    const { result } = await setup();
    await submit(result.current);

    expect(result.current.error).toBe('Correo o contraseña incorrectos, o no hay conexión.');
    expect(result.current.loading).toBe(false);
  });

  test('un nuevo intento limpia el error anterior', async () => {
    auth.falloAlEntrar = new Error('x');
    const { result } = await setup();
    await submit(result.current);
    auth.falloAlEntrar = null;

    await submit(result.current);

    expect(result.current.error).toBeNull();
  });
});

describe('crear cuenta', () => {
  test('sin las dos casillas no se envía nada, pero se marca el intento', async () => {
    const { result } = await setup();
    await act(() => result.current.toggleMode());
    await act(() => result.current.setAcceptsDataPolicy(true));

    await submit(result.current);

    expect(auth.registros).toEqual([]);
    expect(result.current.signUpAttempted).toBe(true);
    expect(result.current.loading).toBe(false);
  });

  test('con las dos casillas y el formulario válido registra con autorización expresa', async () => {
    const { result } = await setup();
    await act(() => result.current.toggleMode());
    await act(() => result.current.setAcceptsDataPolicy(true));
    await act(() => result.current.setAcceptsTerms(true));

    await submit(result.current);

    expect(auth.registros).toEqual([
      { name: 'Ana', email: 'ana@correo.test', password: 'secreto', acceptsDocuments: true },
    ]);
    expect(result.current.error).toBeNull();
  });

  test('con las casillas pero el formulario inválido tampoco registra', async () => {
    const { result } = await setup();
    await act(() => result.current.toggleMode());
    await act(() => result.current.setAcceptsDataPolicy(true));
    await act(() => result.current.setAcceptsTerms(true));

    await submit(result.current, { valid: false });

    expect(auth.registros).toEqual([]);
  });

  test('si falla (correo ya registrado) muestra el mensaje de registro', async () => {
    auth.falloAlEntrar = new Error('User already registered');
    const { result } = await setup();
    await act(() => result.current.toggleMode());
    await act(() => result.current.setAcceptsDataPolicy(true));
    await act(() => result.current.setAcceptsTerms(true));

    await submit(result.current);

    expect(result.current.error).toBe('No pudimos crear la cuenta. ¿Ese correo ya está registrado?');
    expect(result.current.loading).toBe(false);
  });
});

describe('cuenta demo (bug A)', () => {
  test('con el flag apagado (release) nunca se ofrece, ni al entrar ni al registrarse', async () => {
    const { result } = await setup({ demoAccount: false });
    expect(result.current.offersDemoAccount).toBe(false);
    await act(() => result.current.toggleMode());
    expect(result.current.offersDemoAccount).toBe(false);
  });

  test('con el flag encendido (debug) se ofrece solo al entrar', async () => {
    const { result } = await setup({ demoAccount: true });
    expect(result.current.offersDemoAccount).toBe(true);
    await act(() => result.current.toggleMode());
    expect(result.current.offersDemoAccount).toBe(false);
  });

  test('por defecto sigue a __DEV__ (las pruebas corren en desarrollo)', async () => {
    expect(__DEV__).toBe(true);
    const { result } = await setup();
    expect(result.current.offersDemoAccount).toBe(true);
  });

  test('las credenciales son las de la cuenta de pruebas del seed', () => {
    expect(DEMO_EMAIL).toBe('viajero@demo.com');
    expect(DEMO_PASSWORD).toBe('demo1234');
  });
});

test('desmontar: una respuesta que llega después no avisa a nadie ni lanza', async () => {
  auth.compuerta = compuerta();
  const { result, unmount } = await setup();
  let pending!: Promise<void>;
  await act(async () => {
    pending = result.current.submit({ isFormValid: true, name: '', email: 'a@b.c', password: 'secreto' });
  });
  await unmount();
  auth.compuerta.completar();

  await expect(pending).resolves.toBeUndefined();
});
