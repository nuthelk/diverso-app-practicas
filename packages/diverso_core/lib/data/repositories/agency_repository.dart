import '../../errors/diverso_exception.dart';
import '../../models/enums.dart';
import '../../models/plan.dart';
import '../../models/plan_draft.dart';
import '../../models/profile.dart';
import '../../models/venta_row.dart';
import '../../utils/formatters.dart';
import '../services/agency_api.dart';

class AgencyRepository {
  AgencyRepository({required AgencyApi api}) : _api = api;

  final AgencyApi _api;

  /// Agencia cuyo dueño es el usuario actual (null si no ha registrado).
  Future<AgencyRef?> miAgencia() async {
    final uid = _api.usuarioId;
    if (uid == null) return null;
    final res = await _api.agenciaDe(uid);
    return res == null ? null : AgencyRef.fromMap(res);
  }

  Future<void> registrarAgencia({
    required String nombre,
    required String numeroRnt,
    required String matriculaCamaraComercio,
    required String ciudad,
    required String telefono,
    required String email,
    required String whatsapp,
    required String descripcion,
  }) async {
    try {
      await _api.insertarAgencia({
        'owner_user_id': _api.usuarioId,
        'nombre': nombre,
        'numero_rnt': numeroRnt,
        'matricula_camara_comercio': matriculaCamaraComercio,
        'ciudad': ciudad,
        'telefono': telefono,
        'email': email,
        'whatsapp': whatsapp,
        'descripcion': descripcion,
        // estado_verificacion queda 'pendiente' forzado por la política RLS
      });
    } on Object catch (e) {
      throw DiversoException.fromPostgrest(e);
    }
  }

  /// Planes de la agencia del usuario (incluye borradores).
  Future<List<Plan>> misPlanes(String agencyId) async =>
      (await _api.planesDe(agencyId)).map(Plan.fromMap).toList();

  Future<String> crearPlan(String agencyId, PlanDraft draft) async {
    try {
      final res = await _api.insertarPlan({...draft.toMap(), 'agency_id': agencyId});
      return res['id'] as String;
    } on Object catch (e) {
      throw DiversoException.fromPostgrest(e);
    }
  }

  Future<void> actualizarPlan(PlanDraft draft) async {
    assert(draft.id != null, 'actualizarPlan requiere id');
    try {
      await _api.actualizarPlan(draft.id!, draft.toMap());
    } on Object catch (e) {
      throw DiversoException.fromPostgrest(e);
    }
  }

  Future<void> publicarPlan(String planId, {required bool publicado}) async {
    try {
      await _api.actualizarPlan(planId, {
        'estado': (publicado ? PlanStatus.publicado : PlanStatus.borrador).db,
      });
    } on Object catch (e) {
      throw DiversoException.fromPostgrest(e);
    }
  }

  Future<void> agregarFecha({
    required String planId,
    required DateTime fecha,
    required int cupoTotal,
  }) async {
    try {
      await _api.insertarFecha({
        'plan_id': planId,
        'fecha': fechaToIso(fecha),
        'cupo_total': cupoTotal,
        'cupo_disponible': cupoTotal,
      });
    } on Object catch (e) {
      throw DiversoException.fromPostgrest(e);
    }
  }

  Future<void> eliminarFecha(String planDateId) => _api.eliminarFecha(planDateId);

  /// Ventas de la agencia (vista agency_sales, filtrada por RLS).
  Future<List<VentaRow>> ventas(String agencyId, {int limit = 200}) async =>
      (await _api.ventasDe(agencyId, limit: limit)).map(VentaRow.fromMap).toList();
}

/// Referencia ligera a la agencia para el panel (usa Agency del modelo).
typedef AgencyRef = Agency;
