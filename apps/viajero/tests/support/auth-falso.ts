import { Profile, UserRole, type AuthRepository, type Public } from '@/core';

import type { Compuerta } from './compuerta';

/** Respuesta de una consulta de consentimiento: los documentos pendientes o un error que se lanza. */
export type RespuestaConsentimiento = string[] | Error;

/**
 * `AuthRepository` sin Supabase para pruebas del router, el consentimiento, el acceso y el perfil
 * (port de `test/support/auth_falso.dart`).
 *
 * Como supabase-js, `onAuthStateChanged` avisa en cada cambio (`cambiarSesion`); a diferencia de
 * supabase-js, NO repite la sesión inicial al suscribirse (igual que el `Stream` de Dart): la
 * sesión inicial se lee con `currentUserId()`.
 */
export class AuthFalso implements Public<AuthRepository> {
  private usuario: string | null;

  /**
   * Una respuesta por consulta de consentimiento, en orden (la última se repite). Por defecto el
   * usuario está al día.
   */
  private readonly respuestas: RespuestaConsentimiento[];

  /** Cuántas veces se consultó el consentimiento. */
  consultas = 0;

  /** Documentos cuya aceptación se registró. */
  readonly registrados: string[] = [];

  /** Si es `true`, `registrarConsentimiento` falla. */
  falloAlRegistrar = false;

  /** Correo y perfil del usuario actual (`currentProfile` lanza [falloAlCargarPerfil] si existe). */
  email: string | null = 'ana@correo.test';
  perfil: Profile | null = null;
  falloAlCargarPerfil: unknown = null;
  cargasDePerfil = 0;

  /** Si no es null, `currentProfile` espera a que se complete (respuestas tardías). */
  compuertaPerfil: Compuerta | null = null;

  /** Si no es null, `signIn`, `signUpViajero` y `signOut` lo lanzan. */
  falloAlEntrar: unknown = null;
  falloAlSalir: unknown = null;

  /** Si no es null, `signIn` y `signUpViajero` esperan a que se complete. */
  compuerta: Compuerta | null = null;

  readonly entradas: { email: string; password: string }[] = [];
  readonly registros: { nombre: string; email: string; password: string; aceptaDocumentos: boolean }[] = [];

  private readonly escuchas = new Set<(usuario: string | null) => void>();

  constructor({
    usuario = 'viajero-1',
    consultas = [[]],
  }: { usuario?: string | null; consultas?: RespuestaConsentimiento[] } = {}) {
    this.usuario = usuario;
    this.respuestas = consultas;
  }

  /** Simula que entra, sale o cambia el usuario de la sesión. */
  cambiarSesion(usuario: string | null): void {
    this.usuario = usuario;
    for (const escucha of [...this.escuchas]) escucha(usuario);
  }

  /** Cuántos oyentes de sesión siguen suscritos (para comprobar que se cancelan). */
  get oyentes(): number {
    return this.escuchas.size;
  }

  onAuthStateChanged(escucha: (usuario: string | null) => void): () => void {
    this.escuchas.add(escucha);
    return () => {
      this.escuchas.delete(escucha);
    };
  }

  async currentUserId(): Promise<string | null> {
    return this.usuario;
  }

  async currentUserEmail(): Promise<string | null> {
    return this.email;
  }

  async consentimientosPendientes(): Promise<string[]> {
    const i = Math.min(this.consultas, this.respuestas.length - 1);
    const respuesta = this.respuestas[i]!;
    this.consultas++;
    if (respuesta instanceof Error) throw respuesta;
    return respuesta;
  }

  async registrarConsentimiento(tipo: string): Promise<void> {
    if (this.falloAlRegistrar) throw new Error('sin red');
    this.registrados.push(tipo);
  }

  async currentProfile(): Promise<Profile> {
    this.cargasDePerfil++;
    await this.compuertaPerfil?.promesa;
    if (this.falloAlCargarPerfil != null) throw this.falloAlCargarPerfil;
    return this.perfil ?? new Profile({ id: 'u', role: UserRole.traveler, name: 'Ana' });
  }

  async signIn({ email, password }: { email: string; password: string }): Promise<void> {
    await this.compuerta?.promesa;
    if (this.falloAlEntrar != null) throw this.falloAlEntrar;
    this.entradas.push({ email, password });
  }

  async signUpViajero(datos: {
    nombre: string;
    email: string;
    password: string;
    aceptaDocumentos: boolean;
  }): Promise<void> {
    await this.compuerta?.promesa;
    if (this.falloAlEntrar != null) throw this.falloAlEntrar;
    this.registros.push({ ...datos });
  }

  async signOut(): Promise<void> {
    if (this.falloAlSalir != null) throw this.falloAlSalir;
    this.cambiarSesion(null);
  }
}
