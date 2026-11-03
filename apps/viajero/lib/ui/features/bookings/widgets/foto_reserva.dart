import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';

import '../../../core/theme/app_text.dart';

/// Foto del plan (o un respaldo de color con el ícono de la categoría). [apagado] le quita color
/// (historial).
class FotoReserva extends StatelessWidget {
  const FotoReserva({super.key, required this.booking, this.apagado = false});

  final Booking booking;
  final bool apagado;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final plan = booking.plan;
    final foto = plan?.fotoPrincipal;

    Widget respaldo({Key? key}) => ColoredBox(
      key: key,
      color: cs.primaryContainer,
      child: Center(
        child: plan == null
            ? Icon(Icons.luggage_rounded, size: 40, color: cs.onPrimaryContainer)
            : Text(plan.categoria.emoji, style: const TextStyle(fontSize: AppText.emojiFoto)),
      ),
    );

    final fondo = foto == null
        ? respaldo(key: const ValueKey('sin-foto-reserva'))
        : Image.network(
            foto,
            key: const ValueKey('foto-reserva'),
            fit: BoxFit.cover,
            gaplessPlayback: true,
            filterQuality: FilterQuality.low,
            errorBuilder: (_, _, _) => respaldo(),
          );
    if (!apagado) return fondo;
    // Historial: la foto pierde color para que las próximas destaquen.
    return ColorFiltered(
      colorFilter: const ColorFilter.matrix(<double>[
        .55, .35, .10, 0, 0, //
        .20, .70, .10, 0, 0,
        .20, .35, .45, 0, 0,
        0, 0, 0, 1, 0,
      ]),
      child: fondo,
    );
  }
}
