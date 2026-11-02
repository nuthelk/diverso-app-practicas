import 'package:diverso_core/diverso_core.dart';

/// Texto en español para el viajero de cualquier error que llegue a un view model: los de la app
/// ([DiversoException]) con su mensaje propio y el resto como error inesperado.
String mensajeDeError(Object error) {
  final falla = error is DiversoException ? error : DiversoException.fromPostgrest(error);
  return falla.mensajeUsuario;
}
