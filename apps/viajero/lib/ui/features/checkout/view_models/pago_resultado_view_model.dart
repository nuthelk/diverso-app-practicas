import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/foundation.dart';

import '../pago_abierto.dart';

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
  bool _desechado = false;

  bool _cargando = true;
  PagoVerificado? _resultado;
  DiversoException? _falla;
  int _intentos = 0;
  bool _reintentandoPago = false;
  String? _errorReintento;

  bool get cargando => _cargando;

  /// Lo que dijo el servidor del pago; null mientras se verifica o si hubo [falla].
  PagoVerificado? get resultado => _resultado;

  /// Por qué no se pudo verificar el pago.
  DiversoException? get falla => _falla;

  /// Cuántas veces se ha preguntado al servidor en esta verificación.
  int get intentos => _intentos;

  bool get sinDatos => transactionId == null && bookingId == null;

  /// «Intentar de nuevo» está abriendo otra vez el pago de la misma reserva.
  bool get reintentandoPago => _reintentandoPago;

  /// Motivo si ese nuevo intento de pago no se pudo abrir o se cerró sin terminar.
  String? get errorReintento => _errorReintento;

  Future<void> verificar() async {
    final yaCargando = _cargando;
    _cargando = true;
    _resultado = null;
    _falla = null;
    _intentos = 0;
    if (!yaCargando) _notificar();

    while (!_desechado) {
      _intentos++;
      try {
        _resultado = await _pasarela.verificar(transactionId: transactionId, bookingId: bookingId);
        _falla = null;
      } on DiversoException catch (e) {
        _falla = e;
        _resultado = null;
        break;
      } on Object catch (e) {
        debugPrint('PagoResultadoViewModel.verificar: $e');
        _falla = DiversoException('ERROR_INESPERADO');
        _resultado = null;
        break;
      }
      if (_resultado!.estado != EstadoPago.pendiente || _intentos >= maxIntentos) break;
      await Future<void>.delayed(pausa);
    }
    _cargando = false;
    _notificar();
  }

  /// Vuelve a abrir el pago de [bookingId] (rechazado o cerrado) con [abrirPago]. No crea otra
  /// reserva: es la misma, que sigue pendiente de pago.
  Future<void> intentarDeNuevo(
    String bookingId,
    Future<PagoAbierto> Function(String bookingId) abrirPago,
  ) async {
    if (_reintentandoPago) return;
    _reintentandoPago = true;
    _errorReintento = null;
    _notificar();
    try {
      final abierto = await abrirPago(bookingId);
      if (abierto == PagoAbierto.cerrado) {
        _errorReintento =
            'Cerraste el pago antes de terminar. Si ya pagaste, toca «Verificar de nuevo».';
      }
    } on DiversoException catch (e) {
      _errorReintento = e.mensajeUsuario;
    } on Object catch (e) {
      debugPrint('PagoResultadoViewModel.intentarDeNuevo: $e');
      _errorReintento = 'No pudimos iniciar el pago. Intenta de nuevo.';
    }
    _reintentandoPago = false;
    _notificar();
  }

  /// La verificación y el nuevo intento pueden terminar cuando la pantalla ya se cerró (el pago
  /// aprobado navega a la confirmación): ahí no hay nadie a quien avisar.
  void _notificar() {
    if (!_desechado) notifyListeners();
  }

  @override
  void dispose() {
    _desechado = true;
    super.dispose();
  }
}
