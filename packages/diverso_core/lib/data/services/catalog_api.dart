import 'package:supabase_flutter/supabase_flutter.dart';

import '../../models/enums.dart';
import '../../models/filtros_catalogo.dart';

/// Acceso crudo al catálogo público en Supabase: devuelve filas (mapas).
class CatalogApi {
  CatalogApi({required SupabaseClient client}) : _client = client;

  final SupabaseClient _client;

  static const _seleccionPlan = '*, agencies(*), plan_dates(*)';

  /// Planes publicados con su agencia y las fechas desde [desde] (YYYY-MM-DD), aplicando los
  /// filtros que no sean null. [busqueda] ya viene normalizada (minúsculas y sin tildes).
  Future<List<Map<String, dynamic>>> planesPublicados({
    required String desde,
    required OrdenCatalogo orden,
    String? busqueda,
    ExperienceCategory? categoria,
    String? destino,
    double? precioMax,
    String? fecha,
    String? agencyId,
  }) {
    // Filtros primero (PostgrestFilterBuilder); orden y límite al final.
    var query = _client
        .from('plans')
        .select(_seleccionPlan)
        .eq('estado', PlanStatus.publicado.db)
        .gte('plan_dates.fecha', desde);

    // Un solo ilike sobre la columna generada `plans.busqueda` (0011: minúsculas y sin tildes).
    // El texto ya no se interpola en un `or(...)`, así que comas y paréntesis no rompen el filtro.
    if (busqueda != null) {
      query = query.ilike('busqueda', '%$busqueda%');
    }
    if (categoria != null) {
      query = query.eq('categoria', categoria.db);
    }
    if (destino != null) {
      query = query.eq('destino', destino);
    }
    if (precioMax != null) {
      query = query.lte('precio_cop', precioMax);
    }
    if (fecha != null) {
      query = query.eq('plan_dates.fecha', fecha);
    }
    if (agencyId != null) {
      query = query.eq('agency_id', agencyId);
    }

    // Ordenes (transform builder) y límite.
    final ordenado = query.order('fecha', ascending: true, referencedTable: 'plan_dates');
    switch (orden) {
      case OrdenCatalogo.rating:
        return ordenado.order('rating_promedio', ascending: false).limit(60);
      case OrdenCatalogo.precioAsc:
        return ordenado.order('precio_cop', ascending: true).limit(60);
      case OrdenCatalogo.precioDesc:
        return ordenado.order('precio_cop', ascending: false).limit(60);
      case OrdenCatalogo.recientes:
        return ordenado.order('created_at', ascending: false).limit(60);
    }
  }

  /// `agencias_publicas`: solo columnas públicas y agregados; con [agencyId], solo esa agencia.
  Future<List<Map<String, dynamic>>> agenciasPublicas({String? agencyId}) async {
    final res = agencyId == null
        ? await _client.rpc('agencias_publicas')
        : await _client.rpc('agencias_publicas', params: {'p_agency_id': agencyId});
    return (res as List).map((e) => (e as Map).cast<String, dynamic>()).toList();
  }

  /// Un plan con su agencia y las fechas desde [desde] (YYYY-MM-DD); falla si no existe.
  Future<Map<String, dynamic>> plan(String planId, {required String desde}) => _client
      .from('plans')
      .select(_seleccionPlan)
      .eq('id', planId)
      .gte('plan_dates.fecha', desde)
      .order('fecha', ascending: true, referencedTable: 'plan_dates')
      .single();

  /// `destino` de cada plan publicado (con repeticiones).
  Future<List<Map<String, dynamic>>> destinosPublicados() => _client
      .from('plans')
      .select('destino')
      .eq('estado', PlanStatus.publicado.db)
      .order('destino');
}
