/// Agencia tal como la ve el viajero: columnas públicas y agregados de la función
/// `agencias_publicas()` (0009). Nunca incluye contactos, comisión ni datos de verificación.
class AgenciaResumen {
  const AgenciaResumen({
    required this.id,
    required this.nombre,
    required this.ciudad,
    this.descripcion = '',
    this.logoUrl,
    this.planesCount = 0,
    this.rating,
    this.reviewsTotal = 0,
    this.portadaUrl,
  });

  final String id;
  final String nombre;
  final String ciudad;
  final String descripcion;
  final String? logoUrl;

  /// Planes publicados.
  final int planesCount;

  /// Promedio de sus planes ponderado por reseñas; null mientras no tenga ninguna.
  final double? rating;
  final int reviewsTotal;

  /// Foto del plan publicado mejor puntuado (o de cualquier plan publicado con foto).
  final String? portadaUrl;

  bool get esNueva => rating == null;

  /// «Nueva» mientras no tenga reseñas: un 0 sería engañoso.
  String get puntajeTexto => rating == null ? 'Nueva' : rating!.toStringAsFixed(1);

  String get planesTexto => '$planesCount ${planesCount == 1 ? 'plan' : 'planes'}';

  /// Letras del círculo de respaldo cuando no hay logo: inicial de las dos primeras palabras
  /// con contenido (sin «de», «y»…), o las dos primeras letras si es una sola.
  String get iniciales {
    final palabras = nombre
        .trim()
        .split(RegExp(r'\s+'))
        .where((p) => p.isNotEmpty && !_conectores.contains(p.toLowerCase()))
        .toList();
    if (palabras.isEmpty) return '?';
    if (palabras.length == 1) {
      final p = palabras.first;
      return p.substring(0, p.length < 2 ? p.length : 2).toUpperCase();
    }
    return '${palabras[0][0]}${palabras[1][0]}'.toUpperCase();
  }

  factory AgenciaResumen.fromMap(Map<String, dynamic> map) => AgenciaResumen(
        id: map['id'] as String,
        nombre: map['nombre'] as String,
        ciudad: (map['ciudad'] as String?) ?? '',
        descripcion: (map['descripcion'] as String?) ?? '',
        logoUrl: map['logo_url'] as String?,
        planesCount: (map['planes_count'] as num?)?.toInt() ?? 0,
        rating: (map['rating'] as num?)?.toDouble(),
        reviewsTotal: (map['reviews_total'] as num?)?.toInt() ?? 0,
        portadaUrl: map['portada_url'] as String?,
      );
}

/// Criterios de orden de la lista de agencias.
enum OrdenAgencias { puntaje, masPlanes, nombre }

extension OrdenAgenciasX on OrdenAgencias {
  String get label => switch (this) {
        OrdenAgencias.puntaje => 'Puntaje',
        OrdenAgencias.masPlanes => 'Más planes',
        OrdenAgencias.nombre => 'Nombre',
      };
}

/// Copia de [agencias] ordenada. Puntaje: mayor primero (empate: más reseñas) y las «Nueva» al
/// final; todos los empates se resuelven por nombre.
List<AgenciaResumen> ordenarAgencias(Iterable<AgenciaResumen> agencias, OrdenAgencias orden) {
  int porNombre(AgenciaResumen a, AgenciaResumen b) =>
      _claveNombre(a.nombre).compareTo(_claveNombre(b.nombre));
  final copia = agencias.toList();
  switch (orden) {
    case OrdenAgencias.puntaje:
      copia.sort((a, b) {
        if (a.esNueva != b.esNueva) return a.esNueva ? 1 : -1;
        final r = (b.rating ?? 0).compareTo(a.rating ?? 0);
        if (r != 0) return r;
        final n = b.reviewsTotal.compareTo(a.reviewsTotal);
        return n != 0 ? n : porNombre(a, b);
      });
    case OrdenAgencias.masPlanes:
      copia.sort((a, b) {
        final n = b.planesCount.compareTo(a.planesCount);
        return n != 0 ? n : porNombre(a, b);
      });
    case OrdenAgencias.nombre:
      copia.sort(porNombre);
  }
  return copia;
}

const _conectores = {'de', 'del', 'la', 'las', 'el', 'los', 'y', 'e', 'en'};

const _acentos = {'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u', 'ü': 'u', 'ñ': 'n'};

/// Minúsculas sin tildes, para ordenar «Álamo» junto a «Alfa».
String _claveNombre(String nombre) =>
    nombre.toLowerCase().split('').map((c) => _acentos[c] ?? c).join();
