import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/foundation.dart';

/// ViewModel de `/pago/resultado`: pregunta al servidor cómo quedó el pago (nunca se confía
/// en la redirección del navegador) y, si Wompi aún no resuelve, reintenta unas veces.
class PagoResultadoViewModel extends ChangeNotifier {
  PagoResultadoViewModel({
    required PaymentGateway pasarela,
    this.transactionId,
    this.bookingId,
    this.maxIntentos = 5,
    this.pausa = const Duration(seconds: 3),
  }) : _pasarela = pasarela;

  final PaymentGateway _pasarela;

  /// `id` que Wompi añadió a la redirección (flujo normal).
  final String? transactionId;

  /// Reserva a verificar sin transacción conocida («Ya pagué, verificar»).
  final String? bookingId;

  final int maxIntentos;
  final Duration pausa;

  bool cargando = true;
  PagoVerificado? resultado;
  DiversoException? falla;
  int intentos = 0;
  bool _cerrado = false;

  bool get sinDatos => transactionId == null && bookingId == null;

  /// Sigue «pendiente» tras agotar los reintentos.
  bool get pendienteAgotado => resultado?.estado == EstadoPago.pendiente && !cargando;

  Future<void> verificar() async {
    final yaCargando = cargando;
    cargando = true;
    resultado = null;
    falla = null;
    intentos = 0;
    if (!yaCargando) notifyListeners();

    while (!_cerrado) {
      intentos++;
      try {
        resultado = await _pasarela.verificar(transactionId: transactionId, bookingId: bookingId);
        falla = null;
      } on DiversoException catch (e) {
        falla = e;
        resultado = null;
        break;
      } catch (_) {
        falla = DiversoException('ERROR_INESPERADO');
        resultado = null;
        break;
      }
      if (resultado!.estado != EstadoPago.pendiente || intentos >= maxIntentos) break;
      await Future<void>.delayed(pausa);
    }
    cargando = false;
    if (!_cerrado) notifyListeners();
  }

  @override
  void dispose() {
    _cerrado = true;
    super.dispose();
  }
}
