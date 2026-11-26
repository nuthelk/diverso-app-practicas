/**
 * Cómo terminó de abrirse el pago de Wompi (`pago_abierto.dart`). Cada plataforma termina distinto
 * y quien lo pidió debe poder distinguirlo en vez de esperar una promesa que quizá no termine.
 */
export const PaymentOutcome = {
  /** Android/iOS: el WebView interceptó la redirección final y la app ya va a `/pago/resultado`. */
  completed: 'completed',
  /** Android/iOS: el viajero cerró el WebView sin terminar el pago. */
  closed: 'closed',
  /**
   * Web: la misma pestaña ya navega a Wompi; la página se descarga y el resultado llega a
   * `/pago/resultado`. No queda nada que esperar aquí: solo termina el estado «procesando».
   */
  redirected: 'redirected',
} as const;
export type PaymentOutcome = (typeof PaymentOutcome)[keyof typeof PaymentOutcome];

/** Abre el pago de una reserva y dice cómo terminó (lo que reciben los view models). */
export type OpenPayment = (bookingId: string) => Promise<PaymentOutcome>;
