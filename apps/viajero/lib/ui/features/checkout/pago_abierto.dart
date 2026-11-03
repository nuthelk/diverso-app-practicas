/// Cómo terminó de abrirse el pago de Wompi (`iniciarPago`). Cada plataforma termina distinto y
/// quien lo pidió debe poder distinguirlo en vez de esperar un `Future` que quizá no termine.
enum PagoAbierto {
  /// Android/iOS: el WebView interceptó la redirección final y la app ya va a `/pago/resultado`.
  completado,

  /// Android/iOS: el viajero cerró el WebView sin terminar el pago.
  cerrado,

  /// Web: la misma ventana ya navega a Wompi; la página se descarga y el resultado llega a
  /// `/pago/resultado`. No queda nada que esperar aquí: solo termina el estado «procesando».
  redirigido,
}
