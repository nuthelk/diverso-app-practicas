import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../router/app_routes.dart';
import '../widgets/aparecer.dart';
import '../widgets/codigo_reserva.dart';
import '../widgets/detalle_viaje.dart';
import '../widgets/itinerario_confirmado.dart';

/// Confirmación inmediata con código e itinerario (Anexo 4: KPI < 5 min), cargada del
/// backend por id para sobrevivir a una recarga en web.
class BookingSuccessView extends StatelessWidget {
  const BookingSuccessView({super.key, required this.booking});

  final Booking booking;

  /// Ancho máximo de la columna en pantallas anchas.
  static const double _anchoMaximo = 460;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final itinerario = booking.plan?.itinerario ?? const <ItinerarioPaso>[];

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: _anchoMaximo),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  TweenAnimationBuilder<double>(
                    tween: Tween(begin: 0, end: 1),
                    duration: const Duration(milliseconds: 380),
                    curve: Curves.elasticOut,
                    builder: (context, t, child) => Transform.scale(scale: t, child: child),
                    child: Container(
                      width: 84,
                      height: 84,
                      decoration: BoxDecoration(color: cs.primaryContainer, shape: BoxShape.circle),
                      child: Icon(Icons.check_rounded, color: cs.primary, size: 46),
                    ),
                  ),
                  const SizedBox(height: 20),
                  Aparecer(
                    paso: 0,
                    child: Column(
                      children: [
                        Text(
                          '¡Listo, nos vemos ahí!',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 26,
                            fontWeight: FontWeight.w800,
                            letterSpacing: -.8,
                            color: cs.onSurface,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'Tu reserva está confirmada y el cupo es tuyo.',
                          textAlign: TextAlign.center,
                          style: TextStyle(fontSize: 14, color: cs.onSurfaceVariant),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                  Aparecer(paso: 1, child: CodigoReserva(codigo: booking.codigo)),
                  const SizedBox(height: 14),
                  Aparecer(paso: 2, child: DetalleViaje(booking: booking)),
                  if (itinerario.isNotEmpty) ...[
                    const SizedBox(height: 14),
                    Aparecer(paso: 3, child: ItinerarioConfirmado(pasos: itinerario)),
                  ],
                  const SizedBox(height: 24),
                  FilledButton(
                    onPressed: () => context.go(AppRoutes.reservas),
                    child: const Text('Ver mis reservas'),
                  ),
                  const SizedBox(height: 8),
                  TextButton(
                    onPressed: () => context.go(AppRoutes.explorar),
                    child: const Text('Seguir explorando'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
