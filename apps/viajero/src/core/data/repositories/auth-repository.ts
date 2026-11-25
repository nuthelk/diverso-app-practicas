import type { SupabaseClient } from '@supabase/supabase-js';

import { ArgumentError, StateError } from '../../errors/errores-programacion';
import { VERSION_LEGAL } from '../../legal/documento-legal';
import type { Fila } from '../../models/fila';
import { Profile } from '../../models/profile';

/**
 * Sesión y consentimientos. NO traduce errores: los de GoTrue salen como `AuthError` crudo (como
 * `AuthException` en Dart). supabase-js devuelve `{data, error}`; aquí se lanza el `error`.
 *
 * Diferencias con Dart por supabase-js: `currentUserId` / `currentUserEmail` son asíncronos (no hay
 * `currentUser` síncrono; se lee la sesión guardada, sin red) y `onAuthStateChanged` es un callback
 * con función para cancelar en vez de un `Stream`.
 */
export class AuthRepository {
  private readonly client: SupabaseClient;

  constructor({ client }: { client: SupabaseClient }) {
    this.client = client;
  }

  /** Inicia sesión con email y contraseña. */
  async signIn({ email, password }: { email: string; password: string }): Promise<void> {
    const { error } = await this.client.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  /**
   * Registra un viajero nuevo. El trigger `handle_new_user` crea su perfil y, si la versión legal
   * coincide con la del servidor, guarda como evidencia la autorización de datos y la aceptación
   * de términos (Ley 1581 de 2012). Sin [aceptaDocumentos] → `ArgumentError` sin llamar al servidor.
   */
  async signUpViajero({
    nombre,
    email,
    password,
    aceptaDocumentos,
  }: {
    nombre: string;
    email: string;
    password: string;
    aceptaDocumentos: boolean;
  }): Promise<void> {
    if (!aceptaDocumentos) throw new ArgumentError('Se requiere la autorización expresa del titular.');
    const { error } = await this.client.auth.signUp({
      email,
      password,
      options: { data: { nombre, rol: 'viajero', consentimiento_version: VERSION_LEGAL } },
    });
    if (error) throw error;
  }

  /**
   * Documentos vigentes que el usuario actual aún no ha aceptado (`tratamiento_datos`,
   * `terminos_viajero`). Vacío si está al día.
   */
  async consentimientosPendientes(): Promise<string[]> {
    const { data } = await this.client.rpc('consentimientos_pendientes').throwOnError();
    return Array.isArray(data) ? data.map((e) => String(e)) : [];
  }

  /** Registra la aceptación de un documento en su versión vigente (falla con VERSION_DESACTUALIZADA si no coincide). */
  async registrarConsentimiento(tipo: string): Promise<void> {
    await this.client
      .rpc('registrar_consentimiento', { p_tipo: tipo, p_version: VERSION_LEGAL, p_origen: 'app' })
      .throwOnError();
  }

  /**
   * Cierra la sesión de ESTE dispositivo (`scope: 'local'`, el default de supabase_flutter).
   * supabase-js usa `global` por defecto: cerraría la sesión en todos los dispositivos del usuario
   * y, sin red, fallaría dejándolo adentro.
   */
  async signOut(): Promise<void> {
    const { error } = await this.client.auth.signOut({ scope: 'local' });
    if (error) throw error;
  }

  /**
   * Avisa el id del usuario (o null) en CADA evento de auth, incluida la sesión inicial y los
   * refrescos de token (filtrar repetidos es cosa de quien escucha). Devuelve la función para
   * cancelar. Ojo: no hagas `await` de otra llamada de supabase dentro de [escucha] (supabase-js
   * puede bloquearse); difiérela con `setTimeout`.
   */
  onAuthStateChanged(escucha: (userId: string | null) => void): () => void {
    const {
      data: { subscription },
    } = this.client.auth.onAuthStateChange((_evento, sesion) => escucha(sesion?.user.id ?? null));
    return () => subscription.unsubscribe();
  }

  async currentUserId(): Promise<string | null> {
    const { data } = await this.client.auth.getSession();
    return data.session?.user.id ?? null;
  }

  async currentUserEmail(): Promise<string | null> {
    const { data } = await this.client.auth.getSession();
    return data.session?.user.email ?? null;
  }

  /** Perfil del usuario con sesión; sin sesión → `StateError('No hay sesión activa')`. */
  async currentProfile(): Promise<Profile> {
    const uid = await this.currentUserId();
    if (uid === null) throw new StateError('No hay sesión activa');
    const { data } = await this.client.from('profiles').select().eq('id', uid).single().throwOnError();
    return Profile.fromMap(data as Fila);
  }
}
