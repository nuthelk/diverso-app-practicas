import 'enums.dart';
import 'plan.dart';

/// Borrador editable de plan para el formulario del panel de agencias.
class PlanDraft {
  PlanDraft({
    this.id,
    required this.titulo,
    required this.destino,
    required this.categoria,
    required this.precioCop,
    required this.resumen,
    required this.descripcion,
    required this.duracionTexto,
    required this.puntoEncuentro,
    required this.incluye,
    required this.incluyeTransporte,
    required this.incluyeComida,
    required this.incluyeHospedaje,
    required this.itinerario,
    required this.politicaCancelacion,
    required this.fotos,
  });

  final String? id;
  final String titulo;
  final String destino;
  final ExperienceCategory categoria;
  final double precioCop;
  final String resumen;
  final String descripcion;
  final String duracionTexto;
  final String puntoEncuentro;
  final List<String> incluye;
  final bool incluyeTransporte;
  final bool incluyeComida;
  final bool incluyeHospedaje;
  final List<ItinerarioPaso> itinerario;
  final String politicaCancelacion;
  final List<String> fotos;

  factory PlanDraft.vacio() => PlanDraft(
    titulo: '',
    destino: '',
    categoria: ExperienceCategory.aventura,
    precioCop: 0,
    resumen: '',
    descripcion: '',
    duracionTexto: '1 día',
    puntoEncuentro: '',
    incluye: [],
    incluyeTransporte: true,
    incluyeComida: false,
    incluyeHospedaje: false,
    itinerario: [],
    politicaCancelacion: '',
    fotos: [],
  );

  factory PlanDraft.dePlan(Plan p) => PlanDraft(
    id: p.id,
    titulo: p.titulo,
    destino: p.destino,
    categoria: p.categoria,
    precioCop: p.precioCop,
    resumen: p.resumen,
    descripcion: p.descripcion,
    duracionTexto: p.duracionTexto,
    puntoEncuentro: p.puntoEncuentro,
    incluye: List.of(p.incluye),
    incluyeTransporte: p.incluyeTransporte,
    incluyeComida: p.incluyeComida,
    incluyeHospedaje: p.incluyeHospedaje,
    itinerario: List.of(p.itinerario),
    politicaCancelacion: p.politicaCancelacion,
    fotos: List.of(p.fotos),
  );

  Map<String, dynamic> toMap() => {
    'titulo': titulo,
    'destino': destino,
    'categoria': categoria.db,
    'precio_cop': precioCop,
    'resumen': resumen,
    'descripcion': descripcion,
    'duracion_texto': duracionTexto,
    'duracion_horas': _duracionHoras(duracionTexto),
    'punto_encuentro': puntoEncuentro,
    'incluye': incluye,
    'incluye_transporte': incluyeTransporte,
    'incluye_comida': incluyeComida,
    'incluye_hospedaje': incluyeHospedaje,
    'itinerario': itinerario.map((i) => i.toMap()).toList(),
    'politica_cancelacion': politicaCancelacion,
    'fotos': fotos,
  };

  static double _duracionHoras(String texto) {
    final t = texto.toLowerCase();
    if (t.contains('2 días') || t.contains('dos días')) return 40;
    if (t.contains('día') || t.contains('dia')) return 12;
    if (t.contains('hora')) {
      final m = RegExp(r'(\d+)').firstMatch(t);
      if (m != null) return double.parse(m.group(1)!);
      return 4;
    }
    return 12;
  }
}
