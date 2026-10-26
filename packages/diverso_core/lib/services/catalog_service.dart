import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/agencia_resumen.dart';
import '../models/enums.dart';
import '../models/plan.dart';
import '../utils/busqueda.dart';
import '../utils/formatters.dart';

/// Filtros del buscador del catálogo.
class FiltrosCatalogo {
  FiltrosCatalogo({
    this.texto,
    this.categoria,
    this.destino,
    this.precioMax,
    this.fecha,
    this.agencyId,
    this.orden = OrdenCatalogo.rating,
  });

  final String? texto;
  final ExperienceCategory? categoria;
  final String? destino;
  final double? precioMax;
  final DateTime? fecha;

  /// Solo los planes de esta agencia (página de agencia).
  final String? agencyId;
  final OrdenCatalogo orden;
}

enum OrdenCatalogo { rating, precioAsc, precioDesc, recientes }

class CatalogService {
  SupabaseClient get _client => Supabase.instance.client;

  /// Planes publicados con su agencia y próximas fechas, aplicando filtros.
  Future<List<Plan>> search(FiltrosCatalogo filtros) async {
    // Las reservas vencidas se liberan en el servidor (pg_cron cada 5 min).
    final hoy = fechaToIso(DateTime.now());
    // Filtros primero (PostgrestFilterBuilder); orden y límite al final.
    var query = _client
        .from('plans')
        .select('*, agencies(*), plan_dates(*)')
        .eq('estado', 'publicado')
        .gte('plan_dates.fecha', hoy);

    // Un solo ilike sobre la columna generada `plans.busqueda` (0011: minúsculas y sin tildes).
    // El texto ya no se interpola en un `or(...)`, así que comas y paréntesis no rompen el filtro.
    final texto = normalizarBusqueda(filtros.texto ?? '');
    if (texto.isNotEmpty) {
      query = query.ilike('busqueda', '%$texto%');
    }
    if (filtros.categoria != null) {
      query = query.eq('categoria', filtros.categoria!.name);
    }
    if (filtros.destino != null && filtros.destino!.isNotEmpty) {
      query = query.eq('destino', filtros.destino!);
    }
    if (filtros.precioMax != null) {
      query = query.lte('precio_cop', filtros.precioMax!);
    }
    if (filtros.fecha != null) {
      query = query.eq('plan_dates.fecha', fechaToIso(filtros.fecha!));
    }
    if (filtros.agencyId != null) {
      query = query.eq('agency_id', filtros.agencyId!);
    }

    // Ordenes (transform builder) y límite.
    final ordenado = query.order('fecha', ascending: true, referencedTable: 'plan_dates');
    final List<dynamic> res;
    switch (filtros.orden) {
      case OrdenCatalogo.rating:
        res = await ordenado.order('rating_promedio', ascending: false).limit(60);
      case OrdenCatalogo.precioAsc:
        res = await ordenado.order('precio_cop', ascending: true).limit(60);
      case OrdenCatalogo.precioDesc:
        res = await ordenado.order('precio_cop', ascending: false).limit(60);
      case OrdenCatalogo.recientes:
        res = await ordenado.order('created_at', ascending: false).limit(60);
    }
    return res.map((e) => Plan.fromMap((e as Map).cast<String, dynamic>())).toList();
  }

  /// Agencias con planes publicados (función `agencias_publicas`: solo columnas públicas y agregados).
  Future<List<AgenciaResumen>> agencias() async {
    final res = await _client.rpc('agencias_publicas');
    return (res as List).map((e) => AgenciaResumen.fromMap((e as Map).cast<String, dynamic>())).toList();
  }

  /// Una agencia y sus planes publicados (misma consulta y modelo que el catálogo). Null si no
  /// existe o no está habilitada.
  Future<({AgenciaResumen agencia, List<Plan> planes})?> agenciaConPlanes(String agencyId) async {
    final (filas, planes) = await (
      _client.rpc('agencias_publicas', params: {'p_agency_id': agencyId}),
      search(FiltrosCatalogo(agencyId: agencyId)),
    ).wait;
    if ((filas as List).isEmpty) return null;
    return (
      agencia: AgenciaResumen.fromMap((filas.first as Map).cast<String, dynamic>()),
      planes: planes,
    );
  }

  Future<Plan> planDetalle(String planId) async {
    final hoy = fechaToIso(DateTime.now());
    final res = await _client
        .from('plans')
        .select('*, agencies(*), plan_dates(*)')
        .eq('id', planId)
        .gte('plan_dates.fecha', hoy)
        .order('fecha', ascending: true, referencedTable: 'plan_dates')
        .single();
    return Plan.fromMap(res);
  }

  /// Destinos distintos con planes publicados (para el filtro).
  Future<List<String>> destinos() async {
    final res = await _client
        .from('plans')
        .select('destino')
        .eq('estado', 'publicado')
        .order('destino');
    final set = res.map((e) => e['destino'] as String).toSet().toList()..sort();
    return set;
  }
}
