import { AuthError } from '@supabase/supabase-js';

import { AuthRepository } from '@/core/data/repositories/auth-repository';
import { ArgumentError, StateError } from '@/core/errors/errores-programacion';
import { VERSION_LEGAL } from '@/core/legal/documento-legal';
import { UserRole } from '@/core/models/enums';

import { capturar } from '../../../support/errores';
import { crearSupabaseFalso, sesionFalsa, type Responder } from '../../../support/supabase-falso';

/** `AuthRepository` no tiene test en Dart: se prueba contra el Supabase falso (GoTrue + PostgREST). */
const gotrue: Responder = (p) => {
  if (p.ruta === '/auth/v1/token') {
    const { password } = p.cuerpo as { password: string };
    return password === 'buena'
      ? { cuerpo: sesionFalsa('viajero-1', 'ana@diverso.test') }
      : { status: 400, cuerpo: { code: 'invalid_credentials', msg: 'Invalid login credentials' } };
  }
  if (p.ruta === '/auth/v1/signup') return { cuerpo: sesionFalsa('nuevo-1', 'nuevo@diverso.test') };
  if (p.ruta === '/auth/v1/logout') return { status: 204 };
  if (p.ruta === '/rest/v1/rpc/consentimientos_pendientes') return { cuerpo: ['tratamiento_datos', 'terminos_viajero'] };
  if (p.ruta === '/rest/v1/profiles') return { cuerpo: { id: 'viajero-1', rol: 'viajero', nombre: 'Ana', telefono: null } };
  return { status: 204 };
};

const crear = () => {
  const { client, pedidos } = crearSupabaseFalso(gotrue);
  return { repo: new AuthRepository({ client }), pedidos };
};

describe('sesión', () => {
  test('signOut cierra SOLO la sesión de este dispositivo (scope local, como supabase_flutter)', async () => {
    // supabase-js usa `global` por defecto: cerraría la sesión en todos los dispositivos (la web se
    // cayó al cerrar sesión en el celular) y sin red fallaría dejando al usuario adentro.
    const { repo, pedidos } = crear();
    await repo.signIn({ email: 'ana@diverso.test', password: 'buena' });
    await repo.signOut();
    const logout = pedidos.find((p) => p.ruta === '/auth/v1/logout');
    expect(logout?.params['scope']).toEqual(['local']);
    expect(await repo.currentUserId()).toBeNull();
  });

  test('signIn con email y contraseña deja la sesión: id, email y perfil', async () => {
    const { repo, pedidos } = crear();
    expect(await repo.currentUserId()).toBeNull();
    await repo.signIn({ email: 'ana@diverso.test', password: 'buena' });
    expect(pedidos[0]!.params['grant_type']).toEqual(['password']);
    expect(await repo.currentUserId()).toBe('viajero-1');
    expect(await repo.currentUserEmail()).toBe('ana@diverso.test');
    const perfil = await repo.currentProfile();
    expect(perfil).toMatchObject({ id: 'viajero-1', rol: UserRole.viajero, nombre: 'Ana' });
    const consultaPerfil = pedidos.find((p) => p.ruta === '/rest/v1/profiles')!;
    expect(consultaPerfil.params['id']).toEqual(['eq.viajero-1']);
    // Con sesión, PostgREST recibe el JWT del viajero (no la clave publicable).
    expect(consultaPerfil.headers['authorization']).toMatch(/^Bearer .+\..+\.firma$/);
  });

  test('credenciales malas: lanza el AuthError crudo (no se traduce, como en Dart)', async () => {
    const { repo } = crear();
    const e = await capturar(() => repo.signIn({ email: 'ana@diverso.test', password: 'mala' }));
    expect(e).toBeInstanceOf(AuthError);
    expect(await repo.currentUserId()).toBeNull();
  });

  test('currentProfile sin sesión: StateError', async () => {
    const { repo } = crear();
    await expect(repo.currentProfile()).rejects.toBeInstanceOf(StateError);
  });

  test('onAuthStateChanged emite el id en cada cambio (también la sesión inicial) y se puede cancelar', async () => {
    const { repo } = crear();
    const ids: (string | null)[] = [];
    const cancelar = repo.onAuthStateChanged((id) => ids.push(id));
    await repo.signIn({ email: 'ana@diverso.test', password: 'buena' });
    await repo.signOut();
    await new Promise((r) => setTimeout(r, 0));
    expect(ids[0]).toBeNull();
    expect(ids).toContain('viajero-1');
    expect(ids.at(-1)).toBeNull();
    cancelar();
    const antes = ids.length;
    await repo.signIn({ email: 'ana@diverso.test', password: 'buena' });
    expect(ids).toHaveLength(antes);
  });
});

describe('registro y consentimientos', () => {
  test('signUpViajero manda nombre, rol y versión legal en los metadatos', async () => {
    const { repo, pedidos } = crear();
    await repo.signUpViajero({ nombre: 'Nuevo', email: 'nuevo@diverso.test', password: 'clave123', aceptaDocumentos: true });
    const p = pedidos.find((x) => x.ruta === '/auth/v1/signup')!;
    expect(p.cuerpo).toMatchObject({
      email: 'nuevo@diverso.test',
      password: 'clave123',
      data: { nombre: 'Nuevo', rol: 'viajero', consentimiento_version: VERSION_LEGAL },
    });
  });

  test('sin aceptar los documentos: ArgumentError y no llama al servidor', async () => {
    const { repo, pedidos } = crear();
    const e = await capturar<Error>(() =>
      repo.signUpViajero({ nombre: 'N', email: 'n@d.co', password: 'x', aceptaDocumentos: false }),
    );
    expect(e).toBeInstanceOf(ArgumentError);
    expect(e.message).toBe('Se requiere la autorización expresa del titular.');
    expect(pedidos).toHaveLength(0);
  });

  test('consentimientosPendientes devuelve los tipos; registrarConsentimiento manda la versión vigente', async () => {
    const { repo, pedidos } = crear();
    expect(await repo.consentimientosPendientes()).toEqual(['tratamiento_datos', 'terminos_viajero']);
    await repo.registrarConsentimiento('terminos_viajero');
    const p = pedidos.find((x) => x.ruta === '/rest/v1/rpc/registrar_consentimiento')!;
    expect(p.cuerpo).toStrictEqual({ p_tipo: 'terminos_viajero', p_version: 'v2-2026-10', p_origen: 'app' });
  });

  test('consentimientosPendientes: si la RPC no devuelve lista, []', async () => {
    const { client } = crearSupabaseFalso(() => ({ cuerpo: { raro: true } }));
    expect(await new AuthRepository({ client }).consentimientosPendientes()).toEqual([]);
  });
});
