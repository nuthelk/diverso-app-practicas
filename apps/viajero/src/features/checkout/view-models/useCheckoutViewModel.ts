import * as Haptics from 'expo-haptics';

import { DiversoError, type Booking, type BookingRepository, type Plan, type PlanDate, type Public } from '@/core';

import { PagoAbierto, type AbrirPago } from '../pago-abierto';
import { useEstadoVivo } from './use-estado-vivo';

/** Máximo de personas por reserva. */
export const MAX_PERSONAS = 20;

const MENSAJE_CERRADO =
  'Cerraste el pago antes de terminar. Si ya pagaste, toca «Ya pagué, verificar»; ' +
  'si no, vuelve a intentarlo (tus cupos siguen retenidos unos minutos).';

/** `HapticFeedback.mediumImpact()`: en web (o sin motor de vibración) no hace nada. */
function vibrarMedio(): void {
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  } catch {
    // Sin soporte en esta plataforma.
  }
}

interface EstadoCheckout {
  /** Hay una reserva, un pago o una cancelación en curso: los botones se bloquean. */
  procesando: boolean;
  /** Web: la misma pestaña ya navega a Wompi. */
  redirigido: boolean;
  /** Mensaje para el usuario del último intento que falló. */
  error: string | null;
  pax: number;
  /**
   * Reserva de este checkout (creada aquí o retomada de [pendiente]). Si el pago no se completa,
   * se reutiliza en el reintento y deja de poderse cambiar el número de viajeros.
   */
  bookingId: string | null;
  /**
   * Reserva pendiente de pago de esta fecha que el viajero ya tenía; mientras exista, el checkout
   * ofrece completarla o cancelarla en vez de crear otra.
   */
  pendiente: Booking | null;
}

/**
 * ViewModel del checkout (`CheckoutViewModel`): crea la reserva atómica (cupos retenidos 30 min)
 * y pide a la pasarela abrir el pago de prueba de Wompi.
 *
 * Regla anti-duplicados (gotcha 9): por viajero y fecha hay a lo sumo UNA reserva pendiente de
 * pago. Si ya existe (p. ej. volvió atrás desde Wompi), `pagar` no crea otra: expone [pendiente]
 * para que el viajero la complete o la cancele. [vibrar] se inyecta en las pruebas.
 */
export function useCheckoutViewModel(
  { reservas }: { reservas: Pick<Public<BookingRepository>, 'pendingBooking' | 'createBooking' | 'cancel'> },
  { vibrar = vibrarMedio }: { vibrar?: () => void } = {},
) {
  const { estado, actual, cambiar, notificar } = useEstadoVivo<EstadoCheckout>(() => ({
    procesando: false,
    redirigido: false,
    error: null,
    pax: 1,
    bookingId: null,
    pendiente: null,
  }));

  /** El número de viajeros ya no cambia una vez hay reserva (creada o pendiente). */
  const personasFijas = (e: EstadoCheckout) => e.bookingId !== null || e.pendiente !== null;

  const setPax = (valor: number) => {
    if (personasFijas(actual.current)) return;
    cambiar({ pax: Math.min(Math.max(valor, 1), MAX_PERSONAS) });
  };

  /**
   * Busca (al abrir el checkout) si ya hay una reserva pendiente vigente para [fecha]. Es solo para
   * mostrar el aviso antes de pagar; la guarda real está en [pagar].
   */
  const cargarPendiente = async (fecha: PlanDate): Promise<void> => {
    try {
      cambiar({ pendiente: await reservas.pendingBooking(fecha.id) }, false);
    } catch (e) {
      console.warn('CheckoutViewModel.cargarPendiente:', e);
      cambiar({ pendiente: null }, false);
    }
    notificar();
  };

  const abrir = async (abrirPago: AbrirPago) => {
    const abierto = await abrirPago(actual.current.bookingId!);
    if (abierto === PagoAbierto.redirigido) cambiar({ redirigido: true }, false);
    if (abierto === PagoAbierto.cerrado) cambiar({ error: MENSAJE_CERRADO }, false);
  };

  const ejecutar = async (accion: () => Promise<void>) => {
    cambiar({ procesando: true, error: null });
    vibrar();
    try {
      await accion();
    } catch (e) {
      if (e instanceof DiversoError) {
        cambiar({ error: e.userMessage }, false);
      } else {
        console.warn('CheckoutViewModel._ejecutar:', e);
        cambiar({ error: 'No pudimos iniciar el pago. Intenta de nuevo.' }, false);
      }
    }
    cambiar({ procesando: false });
  };

  /**
   * Reserva (una sola vez) y delega en [abrirPago] el cobro con Wompi. [abrirPago] dice cómo
   * terminó: si el viajero lo cerró sin terminar queda un aviso; los errores quedan en [error].
   */
  const pagar = async (fecha: PlanDate, abrirPago: AbrirPago): Promise<void> => {
    if (actual.current.procesando || actual.current.redirigido) return;
    await ejecutar(async () => {
      if (actual.current.bookingId === null) {
        const existente = await reservas.pendingBooking(fecha.id);
        if (existente !== null) {
          cambiar({ pendiente: existente }, false);
          return;
        }
        try {
          const creada = await reservas.createBooking({ planDateId: fecha.id, pax: actual.current.pax });
          cambiar({ bookingId: creada.bookingId }, false);
        } catch (e) {
          // El servidor también impide la segunda pendiente (otra pestaña o dispositivo la abrió
          // entre la consulta y el alta): se muestra el mismo aviso en vez de un error.
          if (!(e instanceof DiversoError) || e.code !== 'RESERVA_PENDIENTE_EXISTENTE') throw e;
          const pendiente = await reservas.pendingBooking(fecha.id);
          cambiar({ pendiente }, false);
          if (pendiente === null) throw e;
          return;
        }
      }
      await abrir(abrirPago);
    });
  };

  /** Retoma [pendiente]: mismo id y mismas personas, sin crear otra reserva. */
  const completarPendiente = async (abrirPago: AbrirPago): Promise<void> => {
    const reserva = actual.current.pendiente;
    if (reserva === null || actual.current.procesando || actual.current.redirigido) return;
    await ejecutar(async () => {
      cambiar({ bookingId: reserva.id, pax: reserva.pax, pendiente: null }, false);
      await abrir(abrirPago);
    });
  };

  /**
   * Cancela [pendiente] (reservas-cancelar: sin pago no hay reembolso y se liberan los cupos) para
   * que el viajero empiece de nuevo.
   */
  const cancelarPendiente = async (): Promise<void> => {
    const reserva = actual.current.pendiente;
    if (reserva === null || actual.current.procesando) return;
    await ejecutar(async () => {
      await reservas.cancel(reserva.id);
      cambiar({ pendiente: null }, false);
    });
  };

  const fijas = personasFijas(estado);
  return {
    procesando: estado.procesando,
    error: estado.error,
    pax: estado.pax,
    bookingId: estado.bookingId,
    pendiente: estado.pendiente,
    puedeQuitarPersona: !fijas && estado.pax > 1,
    /** Se puede sumar otra persona mientras haya [cupos] en la fecha y no se pase del máximo. */
    puedeAgregarPersona: (cupos: number) => !fijas && estado.pax < cupos && estado.pax < MAX_PERSONAS,
    /**
     * «Pagar con Wompi» se bloquea mientras algo está en curso, hay una pendiente por resolver o
     * (web) la misma pestaña ya navega a Wompi: un segundo toque antes de que la página se
     * descargue abriría otro intento de pago de la misma reserva.
     */
    puedePagar: !estado.procesando && !estado.redirigido && estado.pendiente === null,
    total: (plan: Plan) => plan.priceCop * estado.pax,
    setPax,
    cargarPendiente,
    pagar,
    completarPendiente,
    cancelarPendiente,
  };
}

export type CheckoutViewModel = ReturnType<typeof useCheckoutViewModel>;
