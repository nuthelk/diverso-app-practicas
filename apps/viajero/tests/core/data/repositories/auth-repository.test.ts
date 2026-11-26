import { AuthError } from '@supabase/supabase-js';

import { AuthRepository } from '@/core/data/repositories/auth-repository';
import { ArgumentError, StateError } from '@/core/errors/programming-errors';
import { LEGAL_VERSION } from '@/core/legal/legal-document';
import { UserRole } from '@/core/models/enums';

import { capture } from '../../../support/errors';
import { createFakeSupabase, fakeSession, type Responder } from '../../../support/fake-supabase';

/** `AuthRepository` no tiene test en Dart: se prueba contra el Supabase falso (GoTrue + PostgREST). */
const gotrue: Responder = (p) => {
  if (p.path === '/auth/v1/token') {
    const { password } = p.body as { password: string };
    return password === 'buena'
      ? { body: fakeSession('viajero-1', 'ana@diverso.test') }
      : { status: 400, body: { code: 'invalid_credentials', msg: 'Invalid login credentials' } };
  }
  if (p.path === '/auth/v1/signup') return { body: fakeSession('nuevo-1', 'nuevo@diverso.test') };
  if (p.path === '/auth/v1/logout') return { status: 204 };
  if (p.path === '/rest/v1/rpc/consentimientos_pendientes') return { body: ['tratamiento_datos', 'terminos_viajero'] };
  if (p.path === '/rest/v1/profiles') return { body: { id: 'viajero-1', rol: 'viajero', nombre: 'Ana', telefono: null } };
  return { status: 204 };
};

const setup = () => {
  const { client, requests } = createFakeSupabase(gotrue);
  return { repo: new AuthRepository({ client }), requests };
};

describe('sesión', () => {
  test('signOut cierra SOLO la sesión de este dispositivo (scope local, como supabase_flutter)', async () => {
    // supabase-js usa `global` por defecto: cerraría la sesión en todos los dispositivos (la web se
    // cayó al cerrar sesión en el celular) y sin red fallaría dejando al usuario adentro.
    const { repo, requests } = setup();
    await repo.signIn({ email: 'ana@diverso.test', password: 'buena' });
    await repo.signOut();
    const logout = requests.find((p) => p.path === '/auth/v1/logout');
    expect(logout?.params['scope']).toEqual(['local']);
    expect(await repo.currentUserId()).toBeNull();
  });

  test('signIn con email y contraseña deja la sesión: id, email y perfil', async () => {
    const { repo, requests } = setup();
    expect(await repo.currentUserId()).toBeNull();
    await repo.signIn({ email: 'ana@diverso.test', password: 'buena' });
    expect(requests[0]!.params['grant_type']).toEqual(['password']);
    expect(await repo.currentUserId()).toBe('viajero-1');
    expect(await repo.currentUserEmail()).toBe('ana@diverso.test');
    const profile = await repo.currentProfile();
    expect(profile).toMatchObject({ id: 'viajero-1', role: UserRole.traveler, name: 'Ana' });
    const profileQuery = requests.find((p) => p.path === '/rest/v1/profiles')!;
    expect(profileQuery.params['id']).toEqual(['eq.viajero-1']);
    // Con sesión, PostgREST recibe el JWT del viajero (no la clave publicable).
    expect(profileQuery.headers['authorization']).toMatch(/^Bearer .+\..+\.firma$/);
  });

  test('credenciales malas: lanza el AuthError crudo (no se traduce, como en Dart)', async () => {
    const { repo } = setup();
    const e = await capture(() => repo.signIn({ email: 'ana@diverso.test', password: 'mala' }));
    expect(e).toBeInstanceOf(AuthError);
    expect(await repo.currentUserId()).toBeNull();
  });

  test('currentProfile sin sesión: StateError', async () => {
    const { repo } = setup();
    await expect(repo.currentProfile()).rejects.toBeInstanceOf(StateError);
  });

  test('onAuthStateChanged emite el id en cada cambio (también la sesión inicial) y se puede cancelar', async () => {
    const { repo } = setup();
    const ids: (string | null)[] = [];
    const unsubscribe = repo.onAuthStateChanged((id) => ids.push(id));
    await repo.signIn({ email: 'ana@diverso.test', password: 'buena' });
    await repo.signOut();
    await new Promise((r) => setTimeout(r, 0));
    expect(ids[0]).toBeNull();
    expect(ids).toContain('viajero-1');
    expect(ids.at(-1)).toBeNull();
    unsubscribe();
    const before = ids.length;
    await repo.signIn({ email: 'ana@diverso.test', password: 'buena' });
    expect(ids).toHaveLength(before);
  });
});

describe('registro y consentimientos', () => {
  test('signUpTraveler manda nombre, rol y versión legal en los metadatos', async () => {
    const { repo, requests } = setup();
    await repo.signUpTraveler({ name: 'Nuevo', email: 'nuevo@diverso.test', password: 'clave123', acceptsDocuments: true });
    const p = requests.find((x) => x.path === '/auth/v1/signup')!;
    expect(p.body).toMatchObject({
      email: 'nuevo@diverso.test',
      password: 'clave123',
      data: { nombre: 'Nuevo', rol: 'viajero', consentimiento_version: LEGAL_VERSION },
    });
  });

  test('sin aceptar los documentos: ArgumentError y no llama al servidor', async () => {
    const { repo, requests } = setup();
    const e = await capture<Error>(() =>
      repo.signUpTraveler({ name: 'N', email: 'n@d.co', password: 'x', acceptsDocuments: false }),
    );
    expect(e).toBeInstanceOf(ArgumentError);
    expect(e.message).toBe('Se requiere la autorización expresa del titular.');
    expect(requests).toHaveLength(0);
  });

  test('pendingConsents devuelve los tipos; recordConsent manda la versión vigente', async () => {
    const { repo, requests } = setup();
    expect(await repo.pendingConsents()).toEqual(['tratamiento_datos', 'terminos_viajero']);
    await repo.recordConsent('terminos_viajero');
    const p = requests.find((x) => x.path === '/rest/v1/rpc/registrar_consentimiento')!;
    expect(p.body).toStrictEqual({ p_tipo: 'terminos_viajero', p_version: 'v2-2026-10', p_origen: 'app' });
  });

  test('pendingConsents: si la RPC no devuelve lista, []', async () => {
    const { client } = createFakeSupabase(() => ({ body: { raro: true } }));
    expect(await new AuthRepository({ client }).pendingConsents()).toEqual([]);
  });
});
