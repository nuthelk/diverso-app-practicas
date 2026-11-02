import 'enums.dart';

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
