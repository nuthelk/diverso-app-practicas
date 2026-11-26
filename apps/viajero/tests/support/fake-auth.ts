import { Profile, UserRole, type AuthRepository, type Public } from '@/core';

import type { Gate } from './gate';

/** Respuesta de una consulta de consentimiento: los documentos pendientes o un error que se lanza. */
export type ConsentResponse = string[] | Error;

/**
 * `AuthRepository` sin Supabase para pruebas del router, el consentimiento, el acceso y el perfil
 * (port de `test/support/auth_falso.dart`).
 *
 * Como supabase-js, `onAuthStateChanged` avisa en cada cambio (`changeSession`); a diferencia de
 * supabase-js, NO repite la sesión inicial al suscribirse (igual que el `Stream` de Dart): la
 * sesión inicial se lee con `currentUserId()`.
 */
export class FakeAuth implements Public<AuthRepository> {
  private userId: string | null;

  /**
   * Una respuesta por consulta de consentimiento, en orden (la última se repite). Por defecto el
   * usuario está al día.
   */
  private readonly responses: ConsentResponse[];

  /** Cuántas veces se consultó el consentimiento. */
  consentQueries = 0;

  /** Documentos cuya aceptación se registró. */
  readonly recordedConsents: string[] = [];

  /** Si es `true`, `recordConsent` falla. */
  recordConsentFailure = false;

  /** Correo y perfil del usuario actual (`currentProfile` lanza [profileFailure] si existe). */
  email: string | null = 'ana@correo.test';
  profile: Profile | null = null;
  profileFailure: unknown = null;
  profileLoads = 0;

  /** Si no es null, `currentProfile` espera a que se complete (respuestas tardías). */
  profileGate: Gate | null = null;

  /** Si no es null, `signIn`, `signUpTraveler` y `signOut` lo lanzan. */
  signInFailure: unknown = null;
  signOutFailure: unknown = null;

  /** Si no es null, `signIn` y `signUpTraveler` esperan a que se complete. */
  gate: Gate | null = null;

  readonly signIns: { email: string; password: string }[] = [];
  readonly signUps: { name: string; email: string; password: string; acceptsDocuments: boolean }[] = [];

  private readonly listeners = new Set<(userId: string | null) => void>();

  constructor({
    userId = 'viajero-1',
    consentResponses = [[]],
  }: { userId?: string | null; consentResponses?: ConsentResponse[] } = {}) {
    this.userId = userId;
    this.responses = consentResponses;
  }

  /** Simula que entra, sale o cambia el usuario de la sesión. */
  changeSession(userId: string | null): void {
    this.userId = userId;
    for (const listener of [...this.listeners]) listener(userId);
  }

  /** Cuántos oyentes de sesión siguen suscritos (para comprobar que se cancelan). */
  get listenerCount(): number {
    return this.listeners.size;
  }

  onAuthStateChanged(listener: (userId: string | null) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async currentUserId(): Promise<string | null> {
    return this.userId;
  }

  async currentUserEmail(): Promise<string | null> {
    return this.email;
  }

  async pendingConsents(): Promise<string[]> {
    const i = Math.min(this.consentQueries, this.responses.length - 1);
    const response = this.responses[i]!;
    this.consentQueries++;
    if (response instanceof Error) throw response;
    return response;
  }

  async recordConsent(documentType: string): Promise<void> {
    if (this.recordConsentFailure) throw new Error('sin red');
    this.recordedConsents.push(documentType);
  }

  async currentProfile(): Promise<Profile> {
    this.profileLoads++;
    await this.profileGate?.promise;
    if (this.profileFailure != null) throw this.profileFailure;
    return this.profile ?? new Profile({ id: 'u', role: UserRole.traveler, name: 'Ana' });
  }

  async signIn({ email, password }: { email: string; password: string }): Promise<void> {
    await this.gate?.promise;
    if (this.signInFailure != null) throw this.signInFailure;
    this.signIns.push({ email, password });
  }

  async signUpTraveler(data: {
    name: string;
    email: string;
    password: string;
    acceptsDocuments: boolean;
  }): Promise<void> {
    await this.gate?.promise;
    if (this.signInFailure != null) throw this.signInFailure;
    this.signUps.push({ ...data });
  }

  async signOut(): Promise<void> {
    if (this.signOutFailure != null) throw this.signOutFailure;
    this.changeSession(null);
  }
}
