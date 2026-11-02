import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';

import 'reserva_widgets.dart';

/// Cabecera de la tarjeta: foto (o respaldo) con un degradado arriba para que la insignia de fecha
/// y la píldora de estado, ambas sólidas, se lean sobre cualquier imagen; el código de la reserva
/// va abajo a la izquierda.
class EncabezadoReserva extends StatelessWidget {
  const EncabezadoReserva({super.key, required this.booking, required this.apagado});

  final Booking booking;
  final bool apagado;

  static const _altura = 132.0;

  @override
  Widget build(BuildContext context) {
    final fecha = booking.planDate?.fecha ?? booking.salidaAt?.toLocal();

    return SizedBox(
      key: const ValueKey('encabezado-reserva'),
      height: _altura,
      child: Stack(
        fit: StackFit.expand,
        children: [
          FotoReserva(booking: booking, apagado: apagado),
          DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [Colors.black.withValues(alpha: .38), Colors.transparent],
                stops: const [0, .55],
              ),
            ),
          ),
          if (fecha != null) Positioned(top: 12, left: 12, child: _InsigniaFecha(fecha: fecha)),
          Positioned(top: 12, right: 12, child: EstadoReservaPill(booking: booking)),
          Positioned(
            left: 12,
            right: 12,
            bottom: 10,
            child: Align(
              alignment: Alignment.bottomLeft,
              child: ChipCodigo(codigo: booking.codigo, sobreFoto: true),
            ),
          ),
        ],
      ),
    );
  }
}

/// Día y mes de la salida en una insignia opaca (legible sobre cualquier foto).
class _InsigniaFecha extends StatelessWidget {
  const _InsigniaFecha({required this.fecha});

  final DateTime fecha;

  static const _meses = [
    'ENE',
    'FEB',
    'MAR',
    'ABR',
    'MAY',
    'JUN',
    'JUL',
    'AGO',
    'SEP',
    'OCT',
    'NOV',
    'DIC',
  ];

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      key: const ValueKey('insignia-fecha'),
      width: 52,
      padding: const EdgeInsets.symmetric(vertical: 6),
      decoration: BoxDecoration(
        color: cs.surface,
        borderRadius: BorderRadius.circular(14),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: .25),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            '${fecha.day}',
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w800,
              height: 1,
              letterSpacing: -.5,
              color: cs.primary,
            ),
          ),
          const SizedBox(height: 3),
          Text(
            _meses[fecha.month - 1],
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: .8,
              color: cs.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }
}
