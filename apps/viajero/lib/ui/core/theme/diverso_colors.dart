import 'package:flutter/material.dart';

/// Colores del sistema de diseño que NO están en el `ColorScheme`, con su valor claro y oscuro.
/// Se leen con `DiversoColors.of(context)`; así hay una sola fuente y el modo oscuro sigue
/// funcionando cuando algún valor deba cambiar.
@immutable
class DiversoColors extends ThemeExtension<DiversoColors> {
  const DiversoColors({
    required this.dorado,
    required this.estadoConfirmada,
    required this.estadoPendiente,
    required this.estadoCancelada,
    required this.estadoCerrada,
    required this.pocosCupos,
    required this.selloSobreFoto,
    required this.controlSobreFoto,
    required this.sombraInsignia,
  });

  /// Estrellas de calificación.
  final Color dorado;

  /// Píldoras de estado de la reserva (texto blanco encima).
  final Color estadoConfirmada;
  final Color estadoPendiente;
  final Color estadoCancelada;

  /// «Realizada» y «Completada»: ya pasó, sin acento.
  final Color estadoCerrada;

  /// Aviso «¡Últimos N!» en las fechas de la ficha.
  final Color pocosCupos;

  /// Fondo oscuro casi opaco del sello «Verificada RNT» cuando va sobre una foto.
  final Color selloSobreFoto;

  /// Fondo oscuro de los controles pequeños sobre una foto (código de reserva, quitar de la
  /// comparación).
  final Color controlSobreFoto;

  /// Sombra de las insignias que flotan sobre la foto (estado, fecha).
  final Color sombraInsignia;

  static const claro = DiversoColors(
    dorado: Color(0xFFE8A33D),
    estadoConfirmada: Color(0xFF1B7A4B),
    estadoPendiente: Color(0xFFB25E09),
    estadoCancelada: Color(0xFFB3261E),
    estadoCerrada: Color(0xFF4A5C6E),
    pocosCupos: Color(0xFFEF6C00),
    selloSobreFoto: Color.from(alpha: .66, red: 0, green: 0, blue: 0),
    controlSobreFoto: Color.from(alpha: .62, red: 0, green: 0, blue: 0),
    sombraInsignia: Color.from(alpha: .25, red: 0, green: 0, blue: 0),
  );

  /// Hoy iguales a [claro]: son colores sólidos con texto blanco o que van sobre fotos, que se leen
  /// igual en los dos modos. Si uno deja de leerse en oscuro, se cambia aquí.
  static const oscuro = claro;

  static DiversoColors of(BuildContext context) {
    final tema = Theme.of(context);
    return tema.extension<DiversoColors>() ?? (tema.brightness == Brightness.dark ? oscuro : claro);
  }

  /// Colores de marca para el círculo de iniciales de las agencias (todos con buen contraste con
  /// texto blanco).
  static const paletaAgencias = <Color>[
    Color(0xFF0E6E4F), // verde selva
    Color(0xFF2D4A73), // azul pizarra
    Color(0xFF7A4A21), // tierra
    Color(0xFF6B3A5B), // ciruela
    Color(0xFF1F6F7A), // lago
    Color(0xFF8A4B14), // cobre
    Color(0xFF4A6A2A), // musgo
    Color(0xFF4F4A8A), // añil
  ];

  @override
  DiversoColors copyWith({
    Color? dorado,
    Color? estadoConfirmada,
    Color? estadoPendiente,
    Color? estadoCancelada,
    Color? estadoCerrada,
    Color? pocosCupos,
    Color? selloSobreFoto,
    Color? controlSobreFoto,
    Color? sombraInsignia,
  }) => DiversoColors(
    dorado: dorado ?? this.dorado,
    estadoConfirmada: estadoConfirmada ?? this.estadoConfirmada,
    estadoPendiente: estadoPendiente ?? this.estadoPendiente,
    estadoCancelada: estadoCancelada ?? this.estadoCancelada,
    estadoCerrada: estadoCerrada ?? this.estadoCerrada,
    pocosCupos: pocosCupos ?? this.pocosCupos,
    selloSobreFoto: selloSobreFoto ?? this.selloSobreFoto,
    controlSobreFoto: controlSobreFoto ?? this.controlSobreFoto,
    sombraInsignia: sombraInsignia ?? this.sombraInsignia,
  );

  @override
  DiversoColors lerp(ThemeExtension<DiversoColors>? other, double t) {
    if (other is! DiversoColors) return this;
    return DiversoColors(
      dorado: Color.lerp(dorado, other.dorado, t)!,
      estadoConfirmada: Color.lerp(estadoConfirmada, other.estadoConfirmada, t)!,
      estadoPendiente: Color.lerp(estadoPendiente, other.estadoPendiente, t)!,
      estadoCancelada: Color.lerp(estadoCancelada, other.estadoCancelada, t)!,
      estadoCerrada: Color.lerp(estadoCerrada, other.estadoCerrada, t)!,
      pocosCupos: Color.lerp(pocosCupos, other.pocosCupos, t)!,
      selloSobreFoto: Color.lerp(selloSobreFoto, other.selloSobreFoto, t)!,
      controlSobreFoto: Color.lerp(controlSobreFoto, other.controlSobreFoto, t)!,
      sombraInsignia: Color.lerp(sombraInsignia, other.sombraInsignia, t)!,
    );
  }
}
