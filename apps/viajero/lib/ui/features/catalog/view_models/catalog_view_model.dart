import 'dart:collection';

import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/foundation.dart';

/// ViewModel del catálogo (MVVM): filtros, resultados y selección para
/// comparar. La vista lo escucha con [ListenableBuilder].
class CatalogViewModel extends ChangeNotifier {
  CatalogViewModel({required CatalogRepository catalogo}) : _catalogo = catalogo;

  /// Cuántos planes se pueden comparar a la vez.
  static const int maxComparar = 3;

  final CatalogRepository _catalogo;
  bool _desechado = false;

  // Estado expuesto (solo lectura hacia la vista)
  List<Plan> _planes = const [];
  List<String> _destinos = const [];
  bool _cargando = true;
  String? _error;
  String? _errorDetalle;

  // Filtros
  String _texto = '';
  ExperienceCategory? _categoria;
  String? _destino;
  double? _precioMax;
  DateTime? _fecha;
  OrdenCatalogo _orden = OrdenCatalogo.rating;

  // Selección para el comparador (máx. [maxComparar])
  final List<String> _seleccion = [];

  List<Plan> get planes => _planes;
  List<String> get destinos => _destinos;
  bool get cargando => _cargando;

  /// Mensaje para el usuario si la última carga falló.
  String? get error => _error;

  /// Detalle técnico del último error (para soporte).
  String? get errorDetalle => _errorDetalle;

  String get texto => _texto;
  ExperienceCategory? get categoria => _categoria;
  String? get destino => _destino;
  double? get precioMax => _precioMax;
  DateTime? get fecha => _fecha;
  OrdenCatalogo get orden => _orden;

  List<Plan> get seleccion =>
      _planes.where((p) => _seleccion.contains(p.id)).toList(growable: false);
  bool comparando(Plan p) => _seleccion.contains(p.id);

  int get filtrosActivos =>
      (_destino != null ? 1 : 0) + (_precioMax != null ? 1 : 0) + (_fecha != null ? 1 : 0);

  Future<void> cargar() async {
    _cargando = true;
    _error = null;
    _errorDetalle = null;
    _notificar();
    try {
      final resultados = await _catalogo.search(
        FiltrosCatalogo(
          texto: _texto,
          categoria: _categoria,
          destino: _destino,
          precioMax: _precioMax,
          fecha: _fecha,
          orden: _orden,
        ),
      );
      final listaDestinos = await _catalogo.destinos();
      // La selección puede referenciar planes que ya no aparecen.
      _seleccion.removeWhere((id) => !resultados.any((p) => p.id == id));
      _planes = UnmodifiableListView(resultados);
      _destinos = UnmodifiableListView(listaDestinos);
    } on Object catch (e) {
      debugPrint('CatalogViewModel.cargar: $e');
      _error = 'No pudimos cargar los planes. Revisa tu conexión e intenta de nuevo.';
      _errorDetalle = e.toString();
    } finally {
      _cargando = false;
      _notificar();
    }
  }

  void setTexto(String valor) {
    _texto = valor;
    _notificar();
  }

  Future<void> buscar() => cargar();

  Future<void> toggleCategoria(ExperienceCategory? c) async {
    _categoria = c == _categoria ? null : c;
    await cargar();
  }

  Future<void> setDestino(String? d) async {
    _destino = d;
    await cargar();
  }

  Future<void> setPrecioMax(double? valor) async {
    _precioMax = valor;
    await cargar();
  }

  Future<void> setFecha(DateTime? f) async {
    _fecha = f;
    await cargar();
  }

  /// Fija destino, precio máximo y fecha a la vez (la hoja de filtros) con una sola consulta.
  /// Un valor null quita ese filtro.
  Future<void> aplicarFiltros({String? destino, double? precioMax, DateTime? fecha}) async {
    _destino = destino;
    _precioMax = precioMax;
    _fecha = fecha;
    await cargar();
  }

  Future<void> limpiarFiltros() => aplicarFiltros();

  Future<void> cambiarOrden(OrdenCatalogo o) async {
    _orden = o;
    await cargar();
  }

  void toggleComparar(Plan p) {
    if (_seleccion.contains(p.id)) {
      _seleccion.remove(p.id);
    } else if (_seleccion.length < maxComparar) {
      _seleccion.add(p.id);
    }
    _notificar();
  }

  void limpiarComparar() {
    _seleccion.clear();
    _notificar();
  }

  /// Una carga puede terminar cuando la pantalla ya se cerró: ahí no hay nadie a quien avisar.
  void _notificar() {
    if (!_desechado) notifyListeners();
  }

  @override
  void dispose() {
    _desechado = true;
    super.dispose();
  }
}
