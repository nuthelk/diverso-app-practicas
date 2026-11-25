import { ConsentViewModel, ConsentState } from '@/features/legal/view-models/consent-view-model';

import { AuthFalso } from '../../../support/auth-falso';
import { compuerta, esperar, type Compuerta } from '../../../support/compuerta';

/**
 * El consentimiento como estado de enrutamiento: qué consulta, cuándo la repite y qué nunca
 * hace (dejar pasar un estado desconocido). Sin red ni Supabase. Port 1:1 de
 * `consent_view_model_test.dart`.
 *
 * Diferencia con Dart: supabase-js no da la sesión de forma síncrona, así que el VM la lee con
 * `currentUserId()` (una microtarea) antes de su primera consulta; por eso algunos tests hacen
 * `await esperar()` justo después de crearlo, donde Dart ya tenía la consulta en vuelo.
 */

const testPendingDocuments = ['tratamiento_datos', 'terminos_viajero'];

const created: ConsentViewModel[] = [];
function createVm(auth: AuthFalso): ConsentViewModel {
  const vm = new ConsentViewModel({ auth });
  created.push(vm);
  return vm;
}

afterEach(() => {
  for (const vm of created.splice(0)) vm.dispose();
  jest.useRealTimers();
});

/** Una consulta de consentimiento que nunca responde. */
class HangingAuth extends AuthFalso {
  override pendingConsents(): Promise<string[]> {
    this.consultas++;
    return new Promise<string[]>(() => {});
  }
}

/** Una consulta de consentimiento que no responde hasta que el test lo decide (solo la primera). */
class SlowAuth extends AuthFalso {
  private served = false;

  constructor(private readonly first: Compuerta<string[]>) {
    super();
  }

  override pendingConsents(): Promise<string[]> {
    if (this.served) return super.pendingConsents();
    this.served = true;
    return this.first.promesa;
  }
}

test('sin sesión no consulta nada y queda verificándose', async () => {
  const auth = new AuthFalso({ usuario: null });
  const vm = createVm(auth);
  await esperar();
  expect(vm.state).toBe(ConsentState.checking);
  expect(auth.consultas).toBe(0);
});

test('con sesión y al día: aceptado', async () => {
  const vm = createVm(new AuthFalso());
  expect(vm.state).toBe(ConsentState.checking);
  await esperar();
  expect(vm.state).toBe(ConsentState.accepted);
  expect(vm.pendingDocuments).toEqual([]);
});

test('con sesión y documentos sin aceptar: pendiente, con cuáles faltan', async () => {
  const vm = createVm(new AuthFalso({ consultas: [testPendingDocuments] }));
  await esperar();
  expect(vm.state).toBe(ConsentState.pending);
  expect(vm.pendingDocuments).toEqual(testPendingDocuments);
});

describe('cuando la consulta falla', () => {
  test('queda en error (nunca aceptado) y «reintentar» vuelve a consultar', async () => {
    const auth = new AuthFalso({ consultas: [new Error('sin red'), testPendingDocuments] });
    const vm = createVm(auth);
    await esperar();
    expect(vm.state).toBe(ConsentState.error);

    await vm.retry();

    expect(auth.consultas).toBe(2);
    expect(vm.state).toBe(ConsentState.pending);
    expect(vm.pendingDocuments).toEqual(testPendingDocuments);
  });

  test('si el reintento también falla sigue en error', async () => {
    const auth = new AuthFalso({ consultas: [new Error('sin red')] });
    const vm = createVm(auth);
    await esperar();
    await vm.retry();
    expect(auth.consultas).toBe(2);
    expect(vm.state).toBe(ConsentState.error);
  });

  test('notifica al pasar por «verificando» y al terminar', async () => {
    const vm = createVm(new AuthFalso({ consultas: [new Error('sin red'), []] }));
    await esperar();
    const seen: ConsentState[] = [];
    vm.subscribe(() => seen.push(vm.state));

    await vm.retry();

    expect(seen).toEqual([ConsentState.checking, ConsentState.accepted]);
  });
});

test('«reintentar» no repite la consulta si ya se sabe el estado', async () => {
  const auth = new AuthFalso({ consultas: [testPendingDocuments] });
  const vm = createVm(auth);
  await esperar();
  await vm.retry();
  expect(auth.consultas).toBe(1);
  expect(vm.state).toBe(ConsentState.pending);
});

describe('sesión', () => {
  test('al iniciar sesión consulta el consentimiento de ese usuario', async () => {
    const auth = new AuthFalso({ usuario: null, consultas: [testPendingDocuments] });
    const vm = createVm(auth);
    await esperar();
    auth.cambiarSesion('viajero-2');
    await esperar();
    expect(auth.consultas).toBe(1);
    expect(vm.state).toBe(ConsentState.pending);
  });

  test('un refresco de token (mismo usuario) no vuelve a consultar', async () => {
    const auth = new AuthFalso();
    const vm = createVm(auth);
    await esperar();
    let notifications = 0;
    vm.subscribe(() => notifications++);

    auth.cambiarSesion('viajero-1');
    await esperar();

    expect(auth.consultas).toBe(1);
    expect(notifications).toBe(0);
  });

  test('al cambiar de usuario olvida el estado del anterior y consulta de nuevo', async () => {
    const auth = new AuthFalso({ consultas: [[], testPendingDocuments] });
    const vm = createVm(auth);
    await esperar();
    expect(vm.state).toBe(ConsentState.accepted);

    const seen: ConsentState[] = [];
    vm.subscribe(() => seen.push(vm.state));
    auth.cambiarSesion('viajero-2');
    await esperar();

    expect(seen).toEqual([ConsentState.checking, ConsentState.pending]);
  });

  test('al cerrar sesión vuelve a «verificando» y no consulta', async () => {
    const auth = new AuthFalso();
    const vm = createVm(auth);
    await esperar();

    auth.cambiarSesion(null);
    await esperar();

    expect(vm.state).toBe(ConsentState.checking);
    expect(auth.consultas).toBe(1);
  });

  test('la respuesta tardía de un usuario anterior no pisa la del actual', async () => {
    const late = compuerta<string[]>();
    const auth = new SlowAuth(late);
    const vm = createVm(auth);
    await esperar();
    // La consulta de viajero-1 queda colgada; entra otro usuario, que sí está al día.
    auth.cambiarSesion('viajero-2');
    await esperar();
    expect(vm.state).toBe(ConsentState.accepted);

    late.completar(testPendingDocuments);
    await esperar();

    expect(vm.state).toBe(ConsentState.accepted);
    expect(vm.pendingDocuments).toEqual([]);
  });

  test('un evento de sesión que llega antes que la lectura inicial gana (es más nuevo)', async () => {
    const auth = new AuthFalso({ usuario: 'viajero-1', consultas: [testPendingDocuments, []] });
    const vm = createVm(auth);
    // Sin esperar: la lectura inicial (viajero-1) todavía no volvió.
    auth.cambiarSesion(null);
    await esperar();
    expect(auth.consultas).toBe(0);
    expect(vm.state).toBe(ConsentState.checking);
  });
});

describe('aceptar', () => {
  test('registra cada documento pendiente y confirma con el servidor', async () => {
    const auth = new AuthFalso({ consultas: [testPendingDocuments, []] });
    const vm = createVm(auth);
    await esperar();

    const saved = await vm.accept();

    expect(saved).toBe(true);
    expect(auth.registrados).toEqual(testPendingDocuments);
    expect(auth.consultas).toBe(2);
    expect(vm.state).toBe(ConsentState.accepted);
  });

  test('si no se puede guardar devuelve false y sigue pendiente', async () => {
    const auth = new AuthFalso({ consultas: [testPendingDocuments] });
    auth.falloAlRegistrar = true;
    const vm = createVm(auth);
    await esperar();

    expect(await vm.accept()).toBe(false);

    expect(vm.state).toBe(ConsentState.pending);
    expect(auth.registrados).toEqual([]);
    expect(auth.consultas).toBe(1);
  });

  test('si no hay nada pendiente (error o al día) no registra nada', async () => {
    const auth = new AuthFalso({ consultas: [new Error('sin red')] });
    const vm = createVm(auth);
    await esperar();

    expect(await vm.accept()).toBe(false);
    expect(auth.registrados).toEqual([]);
  });
});

test('«cerrar sesión» cierra la sesión del repositorio', async () => {
  const auth = new AuthFalso();
  const vm = createVm(auth);
  await vm.signOut();
  expect(await auth.currentUserId()).toBeNull();
});

describe('una consulta que no responde', () => {
  test('pasado el tiempo límite queda en error y «reintentar» vuelve a consultar', async () => {
    jest.useFakeTimers();
    const auth = new HangingAuth();
    const vm = createVm(auth);
    await jest.advanceTimersByTimeAsync(0);
    expect(vm.state).toBe(ConsentState.checking);

    await jest.advanceTimersByTimeAsync(ConsentViewModel.timeoutMs - 1000);
    expect(vm.state).toBe(ConsentState.checking);

    await jest.advanceTimersByTimeAsync(1000);
    expect(vm.state).toBe(ConsentState.error);
    expect(auth.consultas).toBe(1);

    void vm.retry();
    await jest.advanceTimersByTimeAsync(0);
    expect(auth.consultas).toBe(2);
    expect(vm.state).toBe(ConsentState.checking);
    // La segunda consulta tampoco responde: se vence también y no queda ningún temporizador.
    await jest.advanceTimersByTimeAsync(ConsentViewModel.timeoutMs);
    expect(vm.state).toBe(ConsentState.error);
    expect(jest.getTimerCount()).toBe(0);
  });

  test('si responde a tiempo no hay error', async () => {
    jest.useFakeTimers();
    const late = compuerta<string[]>();
    const vm = createVm(new SlowAuth(late));
    await jest.advanceTimersByTimeAsync(ConsentViewModel.timeoutMs - 1000);

    late.completar([]);
    await jest.advanceTimersByTimeAsync(0);

    expect(vm.state).toBe(ConsentState.accepted);
    expect(jest.getTimerCount()).toBe(0);
    await jest.advanceTimersByTimeAsync(ConsentViewModel.timeoutMs);
    expect(vm.state).toBe(ConsentState.accepted);
  });
});

test('tras dispose una respuesta tardía no notifica y deja de escuchar la sesión', async () => {
  const late = compuerta<string[]>();
  const auth = new SlowAuth(late);
  const vm = new ConsentViewModel({ auth });
  await esperar();
  let notifications = 0;
  vm.subscribe(() => notifications++);

  vm.dispose();
  late.completar(testPendingDocuments);
  await esperar();

  expect(notifications).toBe(0);
  expect(auth.oyentes).toBe(0);
});
