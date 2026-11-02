import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';

import '../../../core/theme/app_radii.dart';

/// Piezas compartidas por la tarjeta de «Mis reservas» y el detalle de la reserva.

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
            : Text(plan.categoria.emoji, style: const TextStyle(fontSize: 40)),
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

/// Estado de la reserva: píldora de color sólido con texto blanco (legible sobre foto y sobre la
/// página). Una confirmada que ya salió dice «Realizada» (solo etiqueta: el estado no cambia).
class EstadoReservaPill extends StatelessWidget {
  const EstadoReservaPill({super.key, required this.booking});

  final Booking booking;

  @override
  Widget build(BuildContext context) {
    final realizada =
        booking.estado == BookingStatus.confirmada && booking.salida != null && !booking.esFutura();
    final (color, texto) = switch (booking.estado) {
      BookingStatus.confirmada when realizada => (const Color(0xFF4A5C6E), 'Realizada'),
      BookingStatus.confirmada => (const Color(0xFF1B7A4B), 'Confirmada'),
      BookingStatus.pendientePago => (const Color(0xFFB25E09), 'Pendiente'),
      BookingStatus.cancelada => (const Color(0xFFB3261E), 'Cancelada'),
      BookingStatus.completada => (const Color(0xFF4A5C6E), 'Completada'),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 5),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(AppRadios.pill),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: .25),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Text(
        texto,
        style: const TextStyle(color: Colors.white, fontSize: 11.5, fontWeight: FontWeight.w700),
      ),
    );
  }
}

/// Código de la reserva como etiqueta discreta. [sobreFoto] usa un fondo oscuro casi opaco para
/// leerse sobre cualquier imagen.
class ChipCodigo extends StatelessWidget {
  const ChipCodigo({super.key, required this.codigo, this.sobreFoto = false});

  final String codigo;
  final bool sobreFoto;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
      decoration: BoxDecoration(
        color: sobreFoto ? Colors.black.withValues(alpha: .62) : cs.surfaceContainerHigh,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        codigo,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: TextStyle(
          fontSize: 11.5,
          fontWeight: FontWeight.w700,
          letterSpacing: .4,
          color: sobreFoto ? Colors.white : cs.onSurfaceVariant,
        ),
      ),
    );
  }
}

/// Fila de dato con ícono: «📅 lun 27 oct · 06:00 · en 3 días». [acento] va al final, en el color
/// primario. El texto se parte en varias líneas antes que desbordar.
class FilaDato extends StatelessWidget {
  const FilaDato({
    super.key,
    required this.icono,
    required this.texto,
    this.acento,
    this.color,
    this.compacto = false,
  });

  final IconData icono;
  final String texto;
  final String? acento;

  /// Color del texto (por defecto el de la página).
  final Color? color;
  final bool compacto;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final tamano = compacto ? 13.0 : 14.5;
    final estilo = TextStyle(fontSize: tamano, height: 1.3, color: color ?? cs.onSurface);
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(top: 1),
          child: Icon(icono, size: compacto ? 16 : 19, color: color ?? cs.onSurfaceVariant),
        ),
        SizedBox(width: compacto ? 8 : 10),
        Expanded(
          child: acento == null
              ? Text(texto, style: estilo)
              : Text.rich(
                  TextSpan(
                    style: estilo,
                    children: [
                      TextSpan(text: texto),
                      TextSpan(
                        text: ' · $acento',
                        style: TextStyle(fontWeight: FontWeight.w700, color: cs.primary),
                      ),
                    ],
                  ),
                ),
        ),
      ],
    );
  }
}

/// Color de la etiqueta de reembolso: rojo si fue rechazado, el primario en los demás casos.
Color colorReembolso(Booking b, ColorScheme cs) =>
    b.reembolso?.estado == EstadoReembolso.rechazado ? cs.error : cs.primary;
