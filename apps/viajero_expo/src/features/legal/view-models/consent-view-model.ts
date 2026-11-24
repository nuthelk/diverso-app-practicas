import type { AuthRepository, Publico } from '@/core';

/** Si el usuario actual aceptó la versión vigente de los documentos legales. */
export const EstadoConsentimiento = {
  /** Aún no se sabe (consulta en curso o sin sesión). */
  verificando: 'verificando',
  /** Falta aceptar algún documento: hay que pedir la autorización. */
  pendiente: 'pendiente',
  aceptado: 'aceptado',
  /** La consulta falló: no se sabe si aceptó, así que se trata como pendiente hasta reintentar. */
  error: 'error',
} as const;
export type EstadoConsentimiento = (typeof EstadoConsentimiento)[keyof typeof EstadoConsentimiento];

export interface InstantaneaConsentimiento {
  readonly estado: EstadoConsentimiento;
  /** Documentos vigentes aún sin aceptar (`tratamiento_datos`, `terminos_viajero`…). */
  readonly pendientes: readonly string[];
}

class TiempoAgotado extends Error {}

/**
 * Estado de consentimiento como estado de **enrutamiento** (Ley 1581 de 2012): el guard lo lee
 * (junto con la sesión) y manda a `/consentimiento` a quien no esté al día. Se vuelve a consultar
 * cuando cambia la sesión y a pedido ([reintentar], que la app llama al volver a primer plano y el
 * botón «Reintentar»).
 *
 * Es el único view model que NO es un hook: es global (vive en `ConsentimientoProvider` durante
 * toda la app) y escucha la sesión por su cuenta, como el `ChangeNotifier` de Flutter. Se lee con
 * `useSyncExternalStore` a través de [suscribir] / [instantanea].
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
  static readonly tiempoLimite = 15_000;

  private readonly auth: Publico<AuthRepository>;
  private readonly cancelarSesion: () => void;
  private readonly escuchas = new Set<() => void>();
  /** `undefined` = todavía no se leyó la sesión inicial. */
  private usuario: string | null | undefined = undefined;
  private actual: InstantaneaConsentimiento = { estado: EstadoConsentimiento.verificando, pendientes: [] };
  /** Se incrementa en cada consulta o cambio de sesión: una respuesta vieja no pisa a una nueva. */
  private revision = 0;
  private desechado = false;

  constructor({ auth }: { auth: Publico<AuthRepository> }) {
    this.auth = auth;
    this.cancelarSesion = auth.onAuthStateChanged((usuario) => this.alCambiarSesion(usuario));
    auth.currentUserId().then(
      (usuario) => this.alLeerSesionInicial(usuario),
      () => this.alLeerSesionInicial(null),
    );
  }

  get estado(): EstadoConsentimiento {
    return this.actual.estado;
  }

  get pendientes(): readonly string[] {
    return this.actual.pendientes;
  }

  /** Objeto inmutable que cambia en cada aviso (para `useSyncExternalStore`). */
  get instantanea(): InstantaneaConsentimiento {
    return this.actual;
  }

  /** `addListener`: devuelve la función para dejar de escuchar. */
  suscribir = (escucha: () => void): (() => void) => {
    this.escuchas.add(escucha);
    return () => {
      this.escuchas.delete(escucha);
    };
  };

  private cambiar(cambios: Partial<InstantaneaConsentimiento>): void {
    this.actual = { ...this.actual, ...cambios };
    // `NotificaSiVive`: tras dispose nadie escucha y no hay nada que actualizar.
    if (this.desechado) return;
    for (const escucha of [...this.escuchas]) escucha();
  }

  private alLeerSesionInicial(usuario: string | null): void {
    // Un evento de sesión que ya llegó es más nuevo que esta lectura.
    if (this.desechado || this.usuario !== undefined) return;
    this.usuario = usuario;
    if (usuario !== null) void this.revisar();
  }

  private alCambiarSesion(usuario: string | null): void {
    // Los refrescos de token repiten el mismo usuario: no hay nada que volver a consultar.
    if (this.desechado || usuario === this.usuario) return;
    this.usuario = usuario;
    this.revision++;
    this.cambiar({ estado: EstadoConsentimiento.verificando, pendientes: [] });
    if (usuario !== null) void this.revisar();
  }

  private async revisar(): Promise<void> {
    const revision = ++this.revision;
    if (this.actual.estado !== EstadoConsentimiento.verificando) {
      this.cambiar({ estado: EstadoConsentimiento.verificando });
    }
    let temporizador: ReturnType<typeof setTimeout> | undefined;
    try {
      const limite = new Promise<never>((_, rechazar) => {
        temporizador = setTimeout(() => rechazar(new TiempoAgotado('consentimiento: tiempo agotado')), ConsentViewModel.tiempoLimite);
      });
      const pendientes = await Promise.race([this.auth.consentimientosPendientes(), limite]);
      if (this.desechado || revision !== this.revision) return;
      this.cambiar({
        pendientes,
        estado: pendientes.length === 0 ? EstadoConsentimiento.aceptado : EstadoConsentimiento.pendiente,
      });
    } catch (e) {
      if (this.desechado || revision !== this.revision) return;
      console.warn('ConsentViewModel: no se pudo verificar el consentimiento:', e);
      this.cambiar({ estado: EstadoConsentimiento.error });
    } finally {
      clearTimeout(temporizador);
    }
  }

  /** Vuelve a consultar solo si la última consulta falló (si ya se sabe, no hay nada que repetir). */
  reintentar = async (): Promise<void> => {
    if (this.actual.estado === EstadoConsentimiento.error && this.usuario) await this.revisar();
  };

  /**
   * Registra la aceptación de los documentos pendientes y confirma con el servidor. `false` si
   * no se pudo guardar (el estado no cambia y el usuario puede intentar de nuevo).
   */
  aceptar = async (): Promise<boolean> => {
    if (this.actual.estado !== EstadoConsentimiento.pendiente) return false;
    try {
      for (const tipo of this.actual.pendientes) {
        await this.auth.registrarConsentimiento(tipo);
      }
    } catch (e) {
      console.warn('ConsentViewModel: no se pudo guardar la autorización:', e);
      return false;
    }
    await this.revisar();
    return true;
  };

  cerrarSesion = (): Promise<void> => this.auth.signOut();

  dispose(): void {
    this.desechado = true;
    this.escuchas.clear();
    this.cancelarSesion();
  }
}
