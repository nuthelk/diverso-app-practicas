import '../../models/agencia_resumen.dart';
import '../../models/filtros_catalogo.dart';
import '../../models/plan.dart';
import '../../utils/busqueda.dart';
import '../../utils/formatters.dart';
import '../../utils/hora_bogota.dart';
import '../services/catalog_api.dart';

class CatalogRepository {
  CatalogRepository({required CatalogApi api}) : _api = api;

  final CatalogApi _api;

  /// Planes publicados con su agencia y próximas fechas, aplicando filtros.
  Future<List<Plan>> search(FiltrosCatalogo filtros) async {
    final texto = normalizarBusqueda(filtros.texto ?? '');
    final destino = filtros.destino;
    final dia = filtros.fecha;
    final filas = await _api.planesPublicados(
      // Las reservas vencidas se liberan en el servidor (pg_cron cada 5 min).
      desde: fechaToIso(hoyBogota()),
      orden: filtros.orden,
      busqueda: texto.isEmpty ? null : texto,
      categoria: filtros.categoria,
      destino: destino == null || destino.isEmpty ? null : destino,
      precioMax: filtros.precioMax,
      fecha: dia == null ? null : fechaToIso(dia),
      agencyId: filtros.agencyId,
    );
    final planes = filas.map(Plan.fromMap);
    // Con una fecha elegida, solo planes que ese día aún tengan una salida por partir.
    return (dia == null ? planes : planes.where((p) => p.tieneSalidaEl(dia))).toList();
  }

  /// Agencias con planes publicados (función `agencias_publicas`: solo columnas públicas y agregados).
  Future<List<AgenciaResumen>> agencias() async =>
      (await _api.agenciasPublicas()).map(AgenciaResumen.fromMap).toList();

  /// Una agencia y sus planes publicados (misma consulta y modelo que el catálogo). Null si no
  /// existe o no está habilitada.
  Future<({AgenciaResumen agencia, List<Plan> planes})?> agenciaConPlanes(String agencyId) async {
    final (filas, planes) = await (
      _api.agenciasPublicas(agencyId: agencyId),
      search(FiltrosCatalogo(agencyId: agencyId)),
    ).wait;
    if (filas.isEmpty) return null;
    return (agencia: AgenciaResumen.fromMap(filas.first), planes: planes);
  }

  Future<Plan> planDetalle(String planId) async =>
      Plan.fromMap(await _api.plan(planId, desde: fechaToIso(hoyBogota())));

  /// Destinos distintos con planes publicados (para el filtro).
  Future<List<String>> destinos() async {
    final filas = await _api.destinosPublicados();
    return filas.map((e) => e['destino'] as String).toSet().toList()..sort();
  }
}
