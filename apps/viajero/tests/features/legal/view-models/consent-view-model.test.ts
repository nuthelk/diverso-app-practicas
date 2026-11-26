import { ConsentViewModel, ConsentState } from '@/features/legal/view-models/consent-view-model';

import { FakeAuth } from '../../../support/fake-auth';
import { createGate, flushMicrotasks, type Gate } from '../../../support/gate';

/**
 * El consentimiento como estado de enrutamiento: qué consulta, cuándo la repite y qué nunca
 * hace (dejar pasar un estado desconocido). Sin red ni Supabase. Port 1:1 de
 * `consent_view_model_test.dart`.
 *
 * Diferencia con Dart: supabase-js no da la sesión de forma síncrona, así que el VM la lee con
 * `currentUserId()` (una microtarea) antes de su primera consulta; por eso algunos tests hacen
 * `await flushMicrotasks()` justo después de crearlo, donde Dart ya tenía la consulta en vuelo.
 */

const testPendingDocuments = ['tratamiento_datos', 'terminos_viajero'];

const created: ConsentViewModel[] = [];
function createVm(auth: FakeAuth): ConsentViewModel {
  const vm = new ConsentViewModel({ auth });
  created.push(vm);
  return vm;
}

afterEach(() => {
  for (const vm of created.splice(0)) vm.dispose();
  jest.useRealTimers();
});

/** Una consulta de consentimiento que nunca responde. */
class HangingAuth extends FakeAuth {
  override pendingConsents(): Promise<string[]> {
    this.consentQueries++;
    return new Promise<string[]>(() => {});
  }
}

/** Una consulta de consentimiento que no responde hasta que el test lo decide (solo la primera). */
class SlowAuth extends FakeAuth {
  private served = false;

  constructor(private readonly first: Gate<string[]>) {
    super();
  }

  override pendingConsents(): Promise<string[]> {
    if (this.served) return super.pendingConsents();
    this.served = true;
    return this.first.promise;
  }
}

test('sin sesión no consulta nada y queda verificándose', async () => {
  const auth = new FakeAuth({ userId: null });
  const vm = createVm(auth);
  await flushMicrotasks();
  expect(vm.state).toBe(ConsentState.checking);
  expect(auth.consentQueries).toBe(0);
});

test('con sesión y al día: aceptado', async () => {
  const vm = createVm(new FakeAuth());
  expect(vm.state).toBe(ConsentState.checking);
  await flushMicrotasks();
  expect(vm.state).toBe(ConsentState.accepted);
  expect(vm.pendingDocuments).toEqual([]);
});

test('con sesión y documentos sin aceptar: pendiente, con cuáles faltan', async () => {
  const vm = createVm(new FakeAuth({ consentResponses: [testPendingDocuments] }));
  await flushMicrotasks();
  expect(vm.state).toBe(ConsentState.pending);
  expect(vm.pendingDocuments).toEqual(testPendingDocuments);
});

describe('cuando la consulta falla', () => {
  test('queda en error (nunca aceptado) y «reintentar» vuelve a consultar', async () => {
    const auth = new FakeAuth({ consentResponses: [new Error('sin red'), testPendingDocuments] });
    const vm = createVm(auth);
    await flushMicrotasks();
    expect(vm.state).toBe(ConsentState.error);

    await vm.retry();

    expect(auth.consentQueries).toBe(2);
    expect(vm.state).toBe(ConsentState.pending);
    expect(vm.pendingDocuments).toEqual(testPendingDocuments);
  });

  test('si el reintento también falla sigue en error', async () => {
    const auth = new FakeAuth({ consentResponses: [new Error('sin red')] });
    const vm = createVm(auth);
    await flushMicrotasks();
    await vm.retry();
    expect(auth.consentQueries).toBe(2);
    expect(vm.state).toBe(ConsentState.error);
  });

  test('notifica al pasar por «verificando» y al terminar', async () => {
    const vm = createVm(new FakeAuth({ consentResponses: [new Error('sin red'), []] }));
    await flushMicrotasks();
    const seen: ConsentState[] = [];
    vm.subscribe(() => seen.push(vm.state));

    await vm.retry();

    expect(seen).toEqual([ConsentState.checking, ConsentState.accepted]);
  });
});

test('«reintentar» no repite la consulta si ya se sabe el estado', async () => {
  const auth = new FakeAuth({ consentResponses: [testPendingDocuments] });
  const vm = createVm(auth);
  await flushMicrotasks();
  await vm.retry();
  expect(auth.consentQueries).toBe(1);
  expect(vm.state).toBe(ConsentState.pending);
});

describe('sesión', () => {
  test('al iniciar sesión consulta el consentimiento de ese usuario', async () => {
    const auth = new FakeAuth({ userId: null, consentResponses: [testPendingDocuments] });
    const vm = createVm(auth);
    await flushMicrotasks();
    auth.changeSession('viajero-2');
    await flushMicrotasks();
    expect(auth.consentQueries).toBe(1);
    expect(vm.state).toBe(ConsentState.pending);
  });

  test('un refresco de token (mismo usuario) no vuelve a consultar', async () => {
    const auth = new FakeAuth();
    const vm = createVm(auth);
    await flushMicrotasks();
    let notifications = 0;
    vm.subscribe(() => notifications++);

    auth.changeSession('viajero-1');
    await flushMicrotasks();

    expect(auth.consentQueries).toBe(1);
    expect(notifications).toBe(0);
  });

  test('al cambiar de usuario olvida el estado del anterior y consulta de nuevo', async () => {
    const auth = new FakeAuth({ consentResponses: [[], testPendingDocuments] });
    const vm = createVm(auth);
    await flushMicrotasks();
    expect(vm.state).toBe(ConsentState.accepted);

    const seen: ConsentState[] = [];
    vm.subscribe(() => seen.push(vm.state));
    auth.changeSession('viajero-2');
    await flushMicrotasks();

    expect(seen).toEqual([ConsentState.checking, ConsentState.pending]);
  });

  test('al cerrar sesión vuelve a «verificando» y no consulta', async () => {
    const auth = new FakeAuth();
    const vm = createVm(auth);
    await flushMicrotasks();

    auth.changeSession(null);
    await flushMicrotasks();

    expect(vm.state).toBe(ConsentState.checking);
    expect(auth.consentQueries).toBe(1);
  });

  test('la respuesta tardía de un usuario anterior no pisa la del actual', async () => {
    const late = createGate<string[]>();
    const auth = new SlowAuth(late);
    const vm = createVm(auth);
    await flushMicrotasks();
    // La consulta de viajero-1 queda colgada; entra otro usuario, que sí está al día.
    auth.changeSession('viajero-2');
    await flushMicrotasks();
    expect(vm.state).toBe(ConsentState.accepted);

    late.resolve(testPendingDocuments);
    await flushMicrotasks();

    expect(vm.state).toBe(ConsentState.accepted);
    expect(vm.pendingDocuments).toEqual([]);
  });

  test('un evento de sesión que llega antes que la lectura inicial gana (es más nuevo)', async () => {
    const auth = new FakeAuth({ userId: 'viajero-1', consentResponses: [testPendingDocuments, []] });
    const vm = createVm(auth);
    // Sin esperar: la lectura inicial (viajero-1) todavía no volvió.
    auth.changeSession(null);
    await flushMicrotasks();
    expect(auth.consentQueries).toBe(0);
    expect(vm.state).toBe(ConsentState.checking);
  });
});

describe('aceptar', () => {
  test('registra cada documento pendiente y confirma con el servidor', async () => {
    const auth = new FakeAuth({ consentResponses: [testPendingDocuments, []] });
    const vm = createVm(auth);
    await flushMicrotasks();

    const saved = await vm.accept();

    expect(saved).toBe(true);
    expect(auth.recordedConsents).toEqual(testPendingDocuments);
    expect(auth.consentQueries).toBe(2);
    expect(vm.state).toBe(ConsentState.accepted);
  });

  test('si no se puede guardar devuelve false y sigue pendiente', async () => {
    const auth = new FakeAuth({ consentResponses: [testPendingDocuments] });
    auth.recordConsentFailure = true;
    const vm = createVm(auth);
    await flushMicrotasks();

    expect(await vm.accept()).toBe(false);

    expect(vm.state).toBe(ConsentState.pending);
    expect(auth.recordedConsents).toEqual([]);
    expect(auth.consentQueries).toBe(1);
  });

  test('si no hay nada pendiente (error o al día) no registra nada', async () => {
    const auth = new FakeAuth({ consentResponses: [new Error('sin red')] });
    const vm = createVm(auth);
    await flushMicrotasks();

    expect(await vm.accept()).toBe(false);
    expect(auth.recordedConsents).toEqual([]);
  });
});

test('«cerrar sesión» cierra la sesión del repositorio', async () => {
  const auth = new FakeAuth();
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
    expect(auth.consentQueries).toBe(1);

    void vm.retry();
    await jest.advanceTimersByTimeAsync(0);
    expect(auth.consentQueries).toBe(2);
    expect(vm.state).toBe(ConsentState.checking);
    // La segunda consulta tampoco responde: se vence también y no queda ningún temporizador.
    await jest.advanceTimersByTimeAsync(ConsentViewModel.timeoutMs);
    expect(vm.state).toBe(ConsentState.error);
    expect(jest.getTimerCount()).toBe(0);
  });

  test('si responde a tiempo no hay error', async () => {
    jest.useFakeTimers();
    const late = createGate<string[]>();
    const vm = createVm(new SlowAuth(late));
    await jest.advanceTimersByTimeAsync(ConsentViewModel.timeoutMs - 1000);

    late.resolve([]);
    await jest.advanceTimersByTimeAsync(0);

    expect(vm.state).toBe(ConsentState.accepted);
    expect(jest.getTimerCount()).toBe(0);
    await jest.advanceTimersByTimeAsync(ConsentViewModel.timeoutMs);
    expect(vm.state).toBe(ConsentState.accepted);
  });
});

test('tras dispose una respuesta tardía no notifica y deja de escuchar la sesión', async () => {
  const late = createGate<string[]>();
  const auth = new SlowAuth(late);
  const vm = new ConsentViewModel({ auth });
  await flushMicrotasks();
  let notifications = 0;
  vm.subscribe(() => notifications++);

  vm.dispose();
  late.resolve(testPendingDocuments);
  await flushMicrotasks();

  expect(notifications).toBe(0);
  expect(auth.listenerCount).toBe(0);
});
