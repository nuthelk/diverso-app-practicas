import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:diverso_core/diverso_core.dart';

/// ViewModel compartido del panel: agencia, planes y ventas de la agencia.
class PanelController extends ChangeNotifier {
  PanelController({required AgencyRepository servicio}) : _servicio = servicio;

  final AgencyRepository _servicio;

  AgencyRef? agencia;
  List<Plan> planes = const [];
  List<VentaRow> ventas = const [];
  bool cargando = true;
  String? error;
  String? errorDetalle;
  String? mensaje;

  Future<void> cargarTodo() async {
    cargando = true;
    error = null;
    errorDetalle = null;
    notifyListeners();
    try {
      agencia = await _servicio.miAgencia();
      if (agencia == null) {
        planes = const [];
        ventas = const [];
      } else {
        final futures = await Future.wait([
          _servicio.misPlanes(agencia!.id),
          _servicio.ventas(agencia!.id),
        ]);
        planes = futures[0] as List<Plan>;
        ventas = futures[1] as List<VentaRow>;
      }
    } catch (e) {
      debugPrint('PanelController.cargarTodo: $e');
      error = 'No pudimos cargar los datos del panel.';
      errorDetalle = e.toString();
    } finally {
      cargando = false;
      notifyListeners();
    }
  }

  Future<bool> publicarPlan(String planId, {required bool publicado}) async {
    try {
      await _servicio.publicarPlan(planId, publicado: publicado);
      mensaje = publicado
          ? 'Plan publicado en el catálogo 🎉'
          : 'Plan pasado a borrador.';
      await cargarTodo();
      return true;
    } on DiversoException catch (e) {
      mensaje = e.mensajeUsuario;
      notifyListeners();
      return false;
    }
  }

  /// Métricas del dashboard (derivadas, sin estado extra).
  double get ventasConfirmadas => ventas
      .where((v) => v.bookingEstado == 'confirmada')
      .fold(0, (s, v) => s + v.montoTotal);

  double get comisionTotal => ventas
      .where((v) => v.bookingEstado == 'confirmada')
      .fold(0, (s, v) => s + v.comision);

  double get saldoTotal => ventas
      .where((v) => v.bookingEstado == 'confirmada')
      .fold(0, (s, v) => s + v.saldoAgencia);

  int get reservasConfirmadas =>
      ventas.where((v) => v.bookingEstado == 'confirmada').length;
}
