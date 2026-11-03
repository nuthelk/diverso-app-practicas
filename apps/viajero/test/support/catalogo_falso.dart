import 'dart:async';

import 'package:diverso_core/diverso_core.dart';

/// [CatalogRepository] sin Supabase para pruebas de view models y vistas del catálogo, la ficha y
/// las agencias.
class CatalogoFalso implements CatalogRepository {
  CatalogoFalso({
    this.planes = const [],
    this.destinosDisponibles = const [],
    Map<String, Plan> detalles = const {},
    this.agenciasPublicas = const [],
    Map<String, List<Plan>> planesPorAgencia = const {},
  }) : detalles = {...detalles},
       planesPorAgencia = {...planesPorAgencia};

  List<Plan> planes;
  List<String> destinosDisponibles;
  final Map<String, Plan> detalles;
  List<AgenciaResumen> agenciasPublicas;
  final Map<String, List<Plan>> planesPorAgencia;

  /// Si no es null, `search`, `destinos`, `planDetalle`, `agencias` y `agenciaConPlanes` lo lanzan.
  Object? fallo;

  /// Si no es null, las consultas esperan a que se complete (para probar respuestas tardías).
  Completer<void>? compuerta;

  /// Un registro por cada llamada a `search`, en orden.
  final busquedas = <FiltrosCatalogo>[];
  int consultasDestinos = 0;
  final detallesPedidos = <String>[];
  int consultasAgencias = 0;
  final agenciasPedidas = <String>[];

  Future<void> _esperar() async {
    await compuerta?.future;
    if (fallo != null) throw fallo!;
  }

  @override
  Future<List<Plan>> search(FiltrosCatalogo filtros) async {
    busquedas.add(filtros);
    await _esperar();
    return planes;
  }

  @override
  Future<List<String>> destinos() async {
    consultasDestinos++;
    await _esperar();
    return destinosDisponibles;
  }

  @override
  Future<Plan> planDetalle(String planId) async {
    detallesPedidos.add(planId);
    await _esperar();
    return detalles[planId]!;
  }

  @override
  Future<List<AgenciaResumen>> agencias() async {
    consultasAgencias++;
    await _esperar();
    return agenciasPublicas;
  }

  /// Null si la agencia no está en [agenciasPublicas] (no existe o no está habilitada).
  @override
  Future<({AgenciaResumen agencia, List<Plan> planes})?> agenciaConPlanes(String agencyId) async {
    agenciasPedidas.add(agencyId);
    await _esperar();
    for (final a in agenciasPublicas) {
      if (a.id == agencyId) return (agencia: a, planes: planesPorAgencia[agencyId] ?? const []);
    }
    return null;
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

/// [ReviewRepository] sin Supabase: devuelve las reseñas dadas (o lanza [fallo]).
class ResenasFalsas implements ReviewRepository {
  ResenasFalsas([this.resenas = const []]);

  List<Review> resenas;
  Object? fallo;
  final pedidas = <String>[];

  @override
  Future<List<Review>> porPlan(String planId, {int limit = 20}) async {
    pedidas.add(planId);
    if (fallo != null) throw fallo!;
    return resenas;
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

Plan planDePrueba({
  String id = 'plan-1',
  String titulo = 'Santa Fe termal',
  List<PlanDate> dates = const [],
  int reviewsCount = 0,
}) => Plan(
  id: id,
  agencyId: 'ag-1',
  titulo: titulo,
  destino: 'Santa Fe de Antioquia',
  categoria: ExperienceCategory.cultura,
  precioCop: 178000,
  estado: PlanStatus.publicado,
  reviewsCount: reviewsCount,
  dates: dates,
);

PlanDate fechaDePrueba(String id, {int dias = 3, int cupos = 10}) => PlanDate(
  id: id,
  planId: 'plan-1',
  fecha: DateTime.now().add(Duration(days: dias)),
  cupoTotal: 20,
  cupoDisponible: cupos,
);
