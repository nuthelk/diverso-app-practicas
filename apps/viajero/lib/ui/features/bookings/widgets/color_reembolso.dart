import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';

/// Color de la etiqueta de reembolso: rojo si fue rechazado, el primario en los demás casos.
Color colorReembolso(Booking b, ColorScheme cs) =>
    b.reembolso?.estado == EstadoReembolso.rechazado ? cs.error : cs.primary;
