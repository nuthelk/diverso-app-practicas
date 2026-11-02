import 'package:supabase_flutter/supabase_flutter.dart';

/// Acceso crudo al panel de agencias en Supabase: devuelve filas (mapas) y deja los errores de
/// PostgREST tal cual; el mapeo a modelos y la traducción de errores son del repositorio.
class AgencyApi {
  AgencyApi({required SupabaseClient client}) : _client = client;

  final SupabaseClient _client;

  /// Id del usuario con sesión, o null.
  String? get usuarioId => _client.auth.currentUser?.id;

  /// La agencia cuyo dueño es [ownerUserId], si existe.
  Future<Map<String, dynamic>?> agenciaDe(String ownerUserId) =>
      _client.from('agencies').select().eq('owner_user_id', ownerUserId).maybeSingle();

  Future<void> insertarAgencia(Map<String, dynamic> fila) => _client.from('agencies').insert(fila);

  /// Planes de la agencia (incluye borradores), el más reciente primero, con fechas ordenadas.
  Future<List<Map<String, dynamic>>> planesDe(String agencyId) => _client
      .from('plans')
      .select('*, agencies(*), plan_dates(*)')
      .eq('agency_id', agencyId)
      .order('created_at', ascending: false)
      .order('fecha', ascending: true, referencedTable: 'plan_dates');

  /// Inserta el plan y devuelve su fila con solo el `id`.
  Future<Map<String, dynamic>> insertarPlan(Map<String, dynamic> fila) =>
      _client.from('plans').insert(fila).select('id').single();

  Future<void> actualizarPlan(String planId, Map<String, dynamic> cambios) =>
      _client.from('plans').update(cambios).eq('id', planId);

  Future<void> insertarFecha(Map<String, dynamic> fila) => _client.from('plan_dates').insert(fila);

  Future<void> eliminarFecha(String planDateId) =>
      _client.from('plan_dates').delete().eq('id', planDateId);

  /// Filas de la vista `agency_sales` (filtrada por RLS), la más reciente primero.
  Future<List<Map<String, dynamic>>> ventasDe(String agencyId, {required int limit}) => _client
      .from('agency_sales')
      .select('*')
      .eq('agency_id', agencyId)
      .order('created_at', ascending: false)
      .limit(limit);
}
