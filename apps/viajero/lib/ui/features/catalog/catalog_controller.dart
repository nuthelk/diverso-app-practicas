import 'package:flutter/foundation.dart';
import 'package:diverso_core/diverso_core.dart';

/// ViewModel del catálogo (MVVM): filtros, resultados y selección para
/// comparar. La vista lo escucha con [ListenableBuilder].
class CatalogController extends ChangeNotifier {
  CatalogController({CatalogService? catalogo}) : _catalogo = catalogo ?? CatalogService();

  final CatalogService _catalogo;

  // Estado expuesto (inmutable hacia la vista)
  List<Plan> planes = const [];
  List<String> destinos = const [];
  bool cargando = true;
  String? error;

  // Filtros
  String texto = '';
  ExperienceCategory? categoria;
  String? destino;
  double? precioMax;
  DateTime? fecha;
  OrdenCatalogo orden = OrdenCatalogo.rating;

  // Selección para el comparador (máx. 3)
  final List<String> _seleccion = [];
  List<Plan> get seleccion =>
      planes.where((p) => _seleccion.contains(p.id)).toList(growable: false);
  bool comparando(Plan p) => _seleccion.contains(p.id);
  static const int maxComparar = 3;

  int get filtrosActivos =>
      (destino != null ? 1 : 0) + (precioMax != null ? 1 : 0) + (fecha != null ? 1 : 0);

  Future<void> cargar() async {
    cargando = true;
    error = null;
    notifyListeners();
    try {
      final resultados = await _catalogo.search(FiltrosCatalogo(
        texto: texto,
        categoria: categoria,
        destino: destino,
        precioMax: precioMax,
        fecha: fecha,
        orden: orden,
      ));
      final listaDestinos = await _catalogo.destinos();
      // La selección puede referenciar planes que ya no aparecen.
      _seleccion.removeWhere((id) => !resultados.any((p) => p.id == id));
      planes = resultados;
      destinos = listaDestinos;
    } catch (e) {
      error = 'No pudimos cargar los planes. ¿Está encendido el servidor local?';
    } finally {
      cargando = false;
      notifyListeners();
    }
  }

  void setTexto(String valor) {
    texto = valor;
    notifyListeners();
  }

  Future<void> buscar() => cargar();

  Future<void> toggleCategoria(ExperienceCategory? c) async {
    categoria = c == categoria ? null : c;
    await cargar();
  }

  Future<void> setDestino(String? d) async {
    destino = d;
    await cargar();
  }

  Future<void> setPrecioMax(double? valor) async {
    precioMax = valor;
    await cargar();
  }

  Future<void> setFecha(DateTime? f) async {
    fecha = f;
    await cargar();
  }

  Future<void> limpiarFiltros() async {
    destino = null;
    precioMax = null;
    fecha = null;
    await cargar();
  }

  Future<void> cambiarOrden(OrdenCatalogo o) async {
    orden = o;
    await cargar();
  }

  void toggleComparar(Plan p) {
    if (_seleccion.contains(p.id)) {
      _seleccion.remove(p.id);
    } else if (_seleccion.length < maxComparar) {
      _seleccion.add(p.id);
    }
    notifyListeners();
  }

  void limpiarComparar() {
    _seleccion.clear();
    notifyListeners();
  }
}
