import { ConsentViewModel, EstadoConsentimiento } from '@/features/legal/view-models/consent-view-model';

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

const pendientesDePrueba = ['tratamiento_datos', 'terminos_viajero'];

const creados: ConsentViewModel[] = [];
function crearVm(auth: AuthFalso): ConsentViewModel {
  const vm = new ConsentViewModel({ auth });
  creados.push(vm);
  return vm;
}

afterEach(() => {
  for (const vm of creados.splice(0)) vm.dispose();
  jest.useRealTimers();
});

/** Una consulta de consentimiento que nunca responde. */
class AuthColgado extends AuthFalso {
  override consentimientosPendientes(): Promise<string[]> {
    this.consultas++;
    return new Promise<string[]>(() => {});
  }
}

/** Una consulta de consentimiento que no responde hasta que el test lo decide (solo la primera). */
class AuthLento extends AuthFalso {
  private atendida = false;

  constructor(private readonly primera: Compuerta<string[]>) {
    super();
  }

  override consentimientosPendientes(): Promise<string[]> {
    if (this.atendida) return super.consentimientosPendientes();
    this.atendida = true;
    return this.primera.promesa;
  }
}

test('sin sesión no consulta nada y queda verificándose', async () => {
  const auth = new AuthFalso({ usuario: null });
  const vm = crearVm(auth);
  await esperar();
  expect(vm.estado).toBe(EstadoConsentimiento.verificando);
  expect(auth.consultas).toBe(0);
});

test('con sesión y al día: aceptado', async () => {
  const vm = crearVm(new AuthFalso());
  expect(vm.estado).toBe(EstadoConsentimiento.verificando);
  await esperar();
  expect(vm.estado).toBe(EstadoConsentimiento.aceptado);
  expect(vm.pendientes).toEqual([]);
});

test('con sesión y documentos sin aceptar: pendiente, con cuáles faltan', async () => {
  const vm = crearVm(new AuthFalso({ consultas: [pendientesDePrueba] }));
  await esperar();
  expect(vm.estado).toBe(EstadoConsentimiento.pendiente);
  expect(vm.pendientes).toEqual(pendientesDePrueba);
});

describe('cuando la consulta falla', () => {
  test('queda en error (nunca aceptado) y «reintentar» vuelve a consultar', async () => {
    const auth = new AuthFalso({ consultas: [new Error('sin red'), pendientesDePrueba] });
    const vm = crearVm(auth);
    await esperar();
    expect(vm.estado).toBe(EstadoConsentimiento.error);

    await vm.reintentar();

    expect(auth.consultas).toBe(2);
    expect(vm.estado).toBe(EstadoConsentimiento.pendiente);
    expect(vm.pendientes).toEqual(pendientesDePrueba);
  });

  test('si el reintento también falla sigue en error', async () => {
    const auth = new AuthFalso({ consultas: [new Error('sin red')] });
    const vm = crearVm(auth);
    await esperar();
    await vm.reintentar();
    expect(auth.consultas).toBe(2);
    expect(vm.estado).toBe(EstadoConsentimiento.error);
  });

  test('notifica al pasar por «verificando» y al terminar', async () => {
    const vm = crearVm(new AuthFalso({ consultas: [new Error('sin red'), []] }));
    await esperar();
    const vistos: EstadoConsentimiento[] = [];
    vm.suscribir(() => vistos.push(vm.estado));

    await vm.reintentar();

    expect(vistos).toEqual([EstadoConsentimiento.verificando, EstadoConsentimiento.aceptado]);
  });
});

test('«reintentar» no repite la consulta si ya se sabe el estado', async () => {
  const auth = new AuthFalso({ consultas: [pendientesDePrueba] });
  const vm = crearVm(auth);
  await esperar();
  await vm.reintentar();
  expect(auth.consultas).toBe(1);
  expect(vm.estado).toBe(EstadoConsentimiento.pendiente);
});

describe('sesión', () => {
  test('al iniciar sesión consulta el consentimiento de ese usuario', async () => {
    const auth = new AuthFalso({ usuario: null, consultas: [pendientesDePrueba] });
    const vm = crearVm(auth);
    await esperar();
    auth.cambiarSesion('viajero-2');
    await esperar();
    expect(auth.consultas).toBe(1);
    expect(vm.estado).toBe(EstadoConsentimiento.pendiente);
  });

  test('un refresco de token (mismo usuario) no vuelve a consultar', async () => {
    const auth = new AuthFalso();
    const vm = crearVm(auth);
    await esperar();
    let avisos = 0;
    vm.suscribir(() => avisos++);

    auth.cambiarSesion('viajero-1');
    await esperar();

    expect(auth.consultas).toBe(1);
    expect(avisos).toBe(0);
  });

  test('al cambiar de usuario olvida el estado del anterior y consulta de nuevo', async () => {
    const auth = new AuthFalso({ consultas: [[], pendientesDePrueba] });
    const vm = crearVm(auth);
    await esperar();
    expect(vm.estado).toBe(EstadoConsentimiento.aceptado);

    const vistos: EstadoConsentimiento[] = [];
    vm.suscribir(() => vistos.push(vm.estado));
    auth.cambiarSesion('viajero-2');
    await esperar();

    expect(vistos).toEqual([EstadoConsentimiento.verificando, EstadoConsentimiento.pendiente]);
  });

  test('al cerrar sesión vuelve a «verificando» y no consulta', async () => {
    const auth = new AuthFalso();
    const vm = crearVm(auth);
    await esperar();

    auth.cambiarSesion(null);
    await esperar();

    expect(vm.estado).toBe(EstadoConsentimiento.verificando);
    expect(auth.consultas).toBe(1);
  });

  test('la respuesta tardía de un usuario anterior no pisa la del actual', async () => {
    const tardia = compuerta<string[]>();
    const auth = new AuthLento(tardia);
    const vm = crearVm(auth);
    await esperar();
    // La consulta de viajero-1 queda colgada; entra otro usuario, que sí está al día.
    auth.cambiarSesion('viajero-2');
    await esperar();
    expect(vm.estado).toBe(EstadoConsentimiento.aceptado);

    tardia.completar(pendientesDePrueba);
    await esperar();

    expect(vm.estado).toBe(EstadoConsentimiento.aceptado);
    expect(vm.pendientes).toEqual([]);
  });

  test('un evento de sesión que llega antes que la lectura inicial gana (es más nuevo)', async () => {
    const auth = new AuthFalso({ usuario: 'viajero-1', consultas: [pendientesDePrueba, []] });
    const vm = crearVm(auth);
    // Sin esperar: la lectura inicial (viajero-1) todavía no volvió.
    auth.cambiarSesion(null);
    await esperar();
    expect(auth.consultas).toBe(0);
    expect(vm.estado).toBe(EstadoConsentimiento.verificando);
  });
});

describe('aceptar', () => {
  test('registra cada documento pendiente y confirma con el servidor', async () => {
    const auth = new AuthFalso({ consultas: [pendientesDePrueba, []] });
    const vm = crearVm(auth);
    await esperar();

    const guardado = await vm.aceptar();

    expect(guardado).toBe(true);
    expect(auth.registrados).toEqual(pendientesDePrueba);
    expect(auth.consultas).toBe(2);
    expect(vm.estado).toBe(EstadoConsentimiento.aceptado);
  });

  test('si no se puede guardar devuelve false y sigue pendiente', async () => {
    const auth = new AuthFalso({ consultas: [pendientesDePrueba] });
    auth.falloAlRegistrar = true;
    const vm = crearVm(auth);
    await esperar();

    expect(await vm.aceptar()).toBe(false);

    expect(vm.estado).toBe(EstadoConsentimiento.pendiente);
    expect(auth.registrados).toEqual([]);
    expect(auth.consultas).toBe(1);
  });

  test('si no hay nada pendiente (error o al día) no registra nada', async () => {
    const auth = new AuthFalso({ consultas: [new Error('sin red')] });
    const vm = crearVm(auth);
    await esperar();

    expect(await vm.aceptar()).toBe(false);
    expect(auth.registrados).toEqual([]);
  });
});

test('«cerrar sesión» cierra la sesión del repositorio', async () => {
  const auth = new AuthFalso();
  const vm = crearVm(auth);
  await vm.cerrarSesion();
  expect(await auth.currentUserId()).toBeNull();
});

describe('una consulta que no responde', () => {
  test('pasado el tiempo límite queda en error y «reintentar» vuelve a consultar', async () => {
    jest.useFakeTimers();
    const auth = new AuthColgado();
    const vm = crearVm(auth);
    await jest.advanceTimersByTimeAsync(0);
    expect(vm.estado).toBe(EstadoConsentimiento.verificando);

    await jest.advanceTimersByTimeAsync(ConsentViewModel.tiempoLimite - 1000);
    expect(vm.estado).toBe(EstadoConsentimiento.verificando);

    await jest.advanceTimersByTimeAsync(1000);
    expect(vm.estado).toBe(EstadoConsentimiento.error);
    expect(auth.consultas).toBe(1);

    void vm.reintentar();
    await jest.advanceTimersByTimeAsync(0);
    expect(auth.consultas).toBe(2);
    expect(vm.estado).toBe(EstadoConsentimiento.verificando);
    // La segunda consulta tampoco responde: se vence también y no queda ningún temporizador.
    await jest.advanceTimersByTimeAsync(ConsentViewModel.tiempoLimite);
    expect(vm.estado).toBe(EstadoConsentimiento.error);
    expect(jest.getTimerCount()).toBe(0);
  });

  test('si responde a tiempo no hay error', async () => {
    jest.useFakeTimers();
    const tardia = compuerta<string[]>();
    const vm = crearVm(new AuthLento(tardia));
    await jest.advanceTimersByTimeAsync(ConsentViewModel.tiempoLimite - 1000);

    tardia.completar([]);
    await jest.advanceTimersByTimeAsync(0);

    expect(vm.estado).toBe(EstadoConsentimiento.aceptado);
    expect(jest.getTimerCount()).toBe(0);
    await jest.advanceTimersByTimeAsync(ConsentViewModel.tiempoLimite);
    expect(vm.estado).toBe(EstadoConsentimiento.aceptado);
  });
});

test('tras dispose una respuesta tardía no notifica y deja de escuchar la sesión', async () => {
  const tardia = compuerta<string[]>();
  const auth = new AuthLento(tardia);
  const vm = new ConsentViewModel({ auth });
  await esperar();
  let avisos = 0;
  vm.suscribir(() => avisos++);

  vm.dispose();
  tardia.completar(pendientesDePrueba);
  await esperar();

  expect(avisos).toBe(0);
  expect(auth.oyentes).toBe(0);
});
