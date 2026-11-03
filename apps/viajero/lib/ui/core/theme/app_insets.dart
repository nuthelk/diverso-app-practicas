import 'package:flutter/widgets.dart';

/// Espaciados que se repiten en el sistema de diseño (los sueltos se quedan donde se usan).
abstract final class AppInsets {
  /// Lista de una pestaña: aire a los lados y abajo, poco arriba.
  static const lista = EdgeInsets.fromLTRB(20, 4, 20, 24);

  /// Lista con algo más de aire arriba (catálogo, bajo el buscador).
  static const listaConAire = EdgeInsets.fromLTRB(20, 8, 20, 24);

  /// Separación entre las tarjetas de una lista.
  static const entreTarjetas = EdgeInsets.only(bottom: 14);

  /// Avisos y tarjetas pequeñas.
  static const tarjeta = EdgeInsets.all(14);

  /// Tarjetas de contenido.
  static const tarjetaAmplia = EdgeInsets.all(16);

  /// Tarjetas con bastante información (detalle del viaje, itinerario).
  static const tarjetaGrande = EdgeInsets.all(18);

  /// Contenido de una pantalla de detalle.
  static const contenido = EdgeInsets.all(20);

  /// Pantallas de un solo formulario o mensaje (iniciar sesión, reseña, éxito, consentimiento).
  static const pantalla = EdgeInsets.all(24);
}
