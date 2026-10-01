import 'enums.dart';
import 'profile.dart';

class ItinerarioPaso {
  ItinerarioPaso({required this.hora, required this.actividad});

  final String hora;
  final String actividad;

  factory ItinerarioPaso.fromMap(Map<String, dynamic> map) => ItinerarioPaso(
        hora: (map['hora'] as String?) ?? '',
        actividad: (map['actividad'] as String?) ?? '',
      );

  Map<String, dynamic> toMap() => {'hora': hora, 'actividad': actividad};
}

class PlanDate {
  PlanDate({
    required this.id,
    required this.planId,
    required this.fecha,
    required this.cupoTotal,
    required this.cupoDisponible,
  });

  final String id;
  final String planId;
  final DateTime fecha;
  final int cupoTotal;
  final int cupoDisponible;

  bool get tieneCupos => cupoDisponible > 0;

  factory PlanDate.fromMap(Map<String, dynamic> map) => PlanDate(
        id: map['id'] as String,
        planId: map['plan_id'] as String,
        fecha: DateTime.parse(map['fecha'] as String),
        cupoTotal: (map['cupo_total'] as num).toInt(),
        cupoDisponible: (map['cupo_disponible'] as num).toInt(),
      );

  Map<String, dynamic> toInsertMap() => {
        'plan_id': planId,
        'fecha': '${fecha.year.toString().padLeft(4, '0')}-'
            '${fecha.month.toString().padLeft(2, '0')}-'
            '${fecha.day.toString().padLeft(2, '0')}',
        'cupo_total': cupoTotal,
        'cupo_disponible': cupoDisponible,
      };
}

class Plan {
  Plan({
    required this.id,
    required this.agencyId,
    required this.titulo,
    required this.destino,
    required this.categoria,
    required this.precioCop,
    required this.estado,
    this.resumen = '',
    this.descripcion = '',
    this.duracionTexto = '1 día',
    this.duracionHoras = 12,
    this.puntoEncuentro = '',
    this.incluye = const [],
    this.incluyeTransporte = false,
    this.incluyeComida = false,
    this.incluyeHospedaje = false,
    this.itinerario = const [],
    this.politicaCancelacion = '',
    this.fotos = const [],
    this.ratingPromedio = 0,
    this.reviewsCount = 0,
    this.agency,
    this.dates = const [],
  });

  final String id;
  final String agencyId;
  final String titulo;
  final String destino;
  final ExperienceCategory categoria;
  final String resumen;
  final String descripcion;
  final String duracionTexto;
  final double duracionHoras;
  final String puntoEncuentro;
  final double precioCop;
  final List<String> incluye;
  final bool incluyeTransporte;
  final bool incluyeComida;
  final bool incluyeHospedaje;
  final List<ItinerarioPaso> itinerario;
  final String politicaCancelacion;
  final List<String> fotos;
  final PlanStatus estado;
  final double ratingPromedio;
  final int reviewsCount;
  final Agency? agency;
  final List<PlanDate> dates;

  String? get fotoPrincipal => fotos.isEmpty ? null : fotos.first;

  /// Próximas fechas con cupos, de la más cercana a la más lejana.
  List<PlanDate> get fechasDisponibles {
    final hoy = DateTime.now();
    final hoySinHora = DateTime(hoy.year, hoy.month, hoy.day);
    return dates.where((d) => d.tieneCupos && !d.fecha.isBefore(hoySinHora)).toList()
      ..sort((a, b) => a.fecha.compareTo(b.fecha));
  }

  factory Plan.fromMap(Map<String, dynamic> map) {
    final agencyMap = map['agencies'];
    final datesMap = map['plan_dates'];
    return Plan(
      id: map['id'] as String,
      agencyId: map['agency_id'] as String,
      titulo: map['titulo'] as String,
      destino: map['destino'] as String,
      categoria:
          enumFromString(ExperienceCategory.values, map['categoria'] as String?) ??
              ExperienceCategory.aventura,
      resumen: (map['resumen'] as String?) ?? '',
      descripcion: (map['descripcion'] as String?) ?? '',
      duracionTexto: (map['duracion_texto'] as String?) ?? '1 día',
      duracionHoras: (map['duracion_horas'] as num?)?.toDouble() ?? 12,
      puntoEncuentro: (map['punto_encuentro'] as String?) ?? '',
      precioCop: (map['precio_cop'] as num).toDouble(),
      incluye: (map['incluye'] as List?)?.map((e) => e as String).toList() ?? const [],
      incluyeTransporte: (map['incluye_transporte'] as bool?) ?? false,
      incluyeComida: (map['incluye_comida'] as bool?) ?? false,
      incluyeHospedaje: (map['incluye_hospedaje'] as bool?) ?? false,
      itinerario: (map['itinerario'] as List?)
              ?.map((e) => ItinerarioPaso.fromMap((e as Map).cast<String, dynamic>()))
              .toList() ??
          const [],
      politicaCancelacion: (map['politica_cancelacion'] as String?) ?? '',
      fotos: (map['fotos'] as List?)?.map((e) => e as String).toList() ?? const [],
      estado: enumFromString(PlanStatus.values, map['estado'] as String?) ?? PlanStatus.borrador,
      ratingPromedio: (map['rating_promedio'] as num?)?.toDouble() ?? 0,
      reviewsCount: (map['reviews_count'] as num?)?.toInt() ?? 0,
      agency: agencyMap is Map ? Agency.fromMap(agencyMap.cast<String, dynamic>()) : null,
      dates: datesMap is List
          ? datesMap.map((e) => PlanDate.fromMap((e as Map).cast<String, dynamic>())).toList()
          : const [],
    );
  }
}
