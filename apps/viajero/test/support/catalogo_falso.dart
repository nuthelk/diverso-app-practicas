import 'dart:async';

import 'package:diverso_core/diverso_core.dart';

/// [CatalogRepository] sin Supabase para pruebas de view models y vistas del catálogo y la ficha.
class CatalogoFalso implements CatalogRepository {
  CatalogoFalso({
    this.planes = const [],
    this.destinosDisponibles = const [],
    Map<String, Plan> detalles = const {},
  }) : detalles = {...detalles};

  List<Plan> planes;
  List<String> destinosDisponibles;
  final Map<String, Plan> detalles;

  /// Si no es null, `search`, `destinos` y `planDetalle` lo lanzan.
  Object? fallo;

  /// Si no es null, las consultas esperan a que se complete (para probar respuestas tardías).
  Completer<void>? compuerta;

  /// Un registro por cada llamada a `search`, en orden.
  final busquedas = <FiltrosCatalogo>[];
  int consultasDestinos = 0;
  final detallesPedidos = <String>[];

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
