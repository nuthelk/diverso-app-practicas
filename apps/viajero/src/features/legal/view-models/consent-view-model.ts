import type { AuthRepository, Public } from '@/core';

/** Si el usuario actual aceptó la versión vigente de los documentos legales. */
export const ConsentState = {
  /** Aún no se sabe (consulta en curso o sin sesión). */
  checking: 'checking',
  /** Falta aceptar algún documento: hay que pedir la autorización. */
  pending: 'pending',
  accepted: 'accepted',
  /** La consulta falló: no se sabe si aceptó, así que se trata como pendiente hasta reintentar. */
  error: 'error',
} as const;
export type ConsentState = (typeof ConsentState)[keyof typeof ConsentState];

export interface ConsentSnapshot {
  readonly state: ConsentState;
  /** Documentos vigentes aún sin aceptar (`tratamiento_datos`, `terminos_viajero`…). */
  readonly pendingDocuments: readonly string[];
}

class TimeoutError extends Error {}

/**
 * Estado de consentimiento como estado de **enrutamiento** (Ley 1581 de 2012): el guard lo lee
 * (junto con la sesión) y manda a `/consentimiento` a quien no esté al día. Se vuelve a consultar
 * cuando cambia la sesión y a pedido ([retry], que la app llama al volver a primer plano y el
 * botón «Reintentar»).
 *
 * Es el único view model que NO es un hook: es global (vive en `ConsentProvider` durante
 * toda la app) y escucha la sesión por su cuenta, como el `ChangeNotifier` de Flutter. Se lee con
 * `useSyncExternalStore` a través de [subscribe] / [snapshot].
 *
 * Diferencia con Dart: supabase-js no da el usuario de forma síncrona; la sesión inicial se lee
 * con `currentUserId()` y, si antes llega un evento de `onAuthStateChanged`, gana el evento (es
 * más nuevo).
 */
export class ConsentViewModel {
  /**
   * Una consulta que no responde en este tiempo (ms) cuenta como fallida (`error`, con
   * «Reintentar»): sin esto una petición colgada dejaría la verificación abierta para siempre.
   */
  static readonly timeoutMs = 15_000;

  private readonly auth: Public<AuthRepository>;
  private readonly unsubscribeSession: () => void;
  private readonly listeners = new Set<() => void>();
  /** `undefined` = todavía no se leyó la sesión inicial. */
  private userId: string | null | undefined = undefined;
  private current: ConsentSnapshot = { state: ConsentState.checking, pendingDocuments: [] };
  /** Se incrementa en cada consulta o cambio de sesión: una respuesta vieja no pisa a una nueva. */
  private revision = 0;
  private disposed = false;

  constructor({ auth }: { auth: Public<AuthRepository> }) {
    this.auth = auth;
    this.unsubscribeSession = auth.onAuthStateChanged((userId) => this.onSessionChange(userId));
    auth.currentUserId().then(
      (userId) => this.onInitialSession(userId),
      () => this.onInitialSession(null),
    );
  }

  get state(): ConsentState {
    return this.current.state;
  }

  get pendingDocuments(): readonly string[] {
    return this.current.pendingDocuments;
  }

  /** Objeto inmutable que cambia en cada aviso (para `useSyncExternalStore`). */
  get snapshot(): ConsentSnapshot {
    return this.current;
  }

  /** `addListener`: devuelve la función para dejar de escuchar. */
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private update(changes: Partial<ConsentSnapshot>): void {
    this.current = { ...this.current, ...changes };
    // `NotificaSiVive`: tras dispose nadie escucha y no hay nada que actualizar.
    if (this.disposed) return;
    for (const listener of [...this.listeners]) listener();
  }

  private onInitialSession(userId: string | null): void {
    // Un evento de sesión que ya llegó es más nuevo que esta lectura.
    if (this.disposed || this.userId !== undefined) return;
    this.userId = userId;
    if (userId !== null) void this.check();
  }

  private onSessionChange(userId: string | null): void {
    // Los refrescos de token repiten el mismo usuario: no hay nada que volver a consultar.
    if (this.disposed || userId === this.userId) return;
    this.userId = userId;
    this.revision++;
    this.update({ state: ConsentState.checking, pendingDocuments: [] });
    if (userId !== null) void this.check();
  }

  private async check(): Promise<void> {
    const revision = ++this.revision;
    if (this.current.state !== ConsentState.checking) {
      this.update({ state: ConsentState.checking });
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new TimeoutError('consentimiento: tiempo agotado')), ConsentViewModel.timeoutMs);
      });
      const pendingDocuments = await Promise.race([this.auth.pendingConsents(), timeout]);
      if (this.disposed || revision !== this.revision) return;
      this.update({
        pendingDocuments,
        state: pendingDocuments.length === 0 ? ConsentState.accepted : ConsentState.pending,
      });
    } catch (e) {
      if (this.disposed || revision !== this.revision) return;
      console.warn('ConsentViewModel: no se pudo verificar el consentimiento:', e);
      this.update({ state: ConsentState.error });
    } finally {
      clearTimeout(timer);
    }
  }

  /** Vuelve a consultar solo si la última consulta falló (si ya se sabe, no hay nada que repetir). */
  retry = async (): Promise<void> => {
    if (this.current.state === ConsentState.error && this.userId) await this.check();
  };

  /**
   * Registra la aceptación de los documentos pendientes y confirma con el servidor. `false` si
   * no se pudo guardar (el estado no cambia y el usuario puede intentar de nuevo).
   */
  accept = async (): Promise<boolean> => {
    if (this.current.state !== ConsentState.pending) return false;
    try {
      for (const documentType of this.current.pendingDocuments) {
        await this.auth.recordConsent(documentType);
      }
    } catch (e) {
      console.warn('ConsentViewModel: no se pudo guardar la autorización:', e);
      return false;
    }
    await this.check();
    return true;
  };

  signOut = (): Promise<void> => this.auth.signOut();

  dispose(): void {
    this.disposed = true;
    this.listeners.clear();
    this.unsubscribeSession();
  }
}
