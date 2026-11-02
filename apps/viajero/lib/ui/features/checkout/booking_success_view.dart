import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/widgets.dart';

/// Confirmación inmediata con código e itinerario (Anexo 4: KPI < 5 min), cargada del
/// backend por id para sobrevivir a una recarga en web.
class BookingSuccessView extends StatelessWidget {
  const BookingSuccessView({super.key, required this.booking});

  final Booking booking;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final plan = booking.plan;
    final fecha = booking.planDate?.fecha;
    final pago = booking.pago;
    final itinerario = plan?.itinerario ?? const <ItinerarioPaso>[];
    final puntoEncuentro = plan?.puntoEncuentro ?? '';

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 460),
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
                  _Aparecer(
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
                  // Código de reserva
                  _Aparecer(
                    paso: 1,
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 18),
                      decoration: BoxDecoration(
                        color: cs.primaryContainer,
                        borderRadius: BorderRadius.circular(AppRadios.card),
                      ),
                      child: Column(
                        children: [
                          Text(
                            'CÓDIGO DE RESERVA',
                            style: TextStyle(
                              fontSize: 10.5,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 1.6,
                              color: cs.onPrimaryContainer.withValues(alpha: .75),
                            ),
                          ),
                          const SizedBox(height: 6),
                          SelectableText(
                            booking.codigo,
                            style: TextStyle(
                              fontSize: 30,
                              fontWeight: FontWeight.w900,
                              letterSpacing: 3,
                              color: cs.onPrimaryContainer,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),
                  // Detalle
                  _Aparecer(
                    paso: 2,
                    child: Container(
                      padding: const EdgeInsets.all(18),
                      decoration: BoxDecoration(
                        color: cs.surfaceContainerLow,
                        borderRadius: BorderRadius.circular(AppRadios.card),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            plan?.titulo ?? 'Tu plan',
                            style: const TextStyle(
                              fontWeight: FontWeight.w700,
                              fontSize: 15.5,
                              height: 1.25,
                            ),
                          ),
                          const SizedBox(height: 12),
                          if (fecha != null)
                            _fila(context, Icons.event_rounded, formatFechaLarga(fecha)),
                          _fila(
                            context,
                            Icons.group_rounded,
                            '${booking.pax} ${booking.pax == 1 ? 'persona' : 'personas'}',
                          ),
                          if (puntoEncuentro.isNotEmpty)
                            _fila(context, Icons.flag_rounded, puntoEncuentro),
                          const Divider(height: 22),
                          _fila(context, Icons.payments_rounded, formatCOP(booking.montoTotal)),
                          if (pago != null)
                            _fila(context, Icons.receipt_rounded, pago.textoReferencia),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              Icon(Icons.verified_user_rounded, size: 14, color: cs.tertiary),
                              const SizedBox(width: 6),
                              Expanded(
                                child: Text(
                                  'Compra protegida: reembolso según la política de cancelación.',
                                  style: TextStyle(fontSize: 12, color: cs.onSurfaceVariant),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                  // Itinerario inmediato (Anexo 6: confirmación + itinerario)
                  if (itinerario.isNotEmpty) ...[
                    const SizedBox(height: 14),
                    _Aparecer(
                      paso: 3,
                      child: Container(
                        padding: const EdgeInsets.all(18),
                        decoration: BoxDecoration(
                          color: cs.surfaceContainerLow,
                          borderRadius: BorderRadius.circular(AppRadios.card),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'ITINERARIO',
                              style: TextStyle(
                                fontSize: 10.5,
                                fontWeight: FontWeight.w700,
                                letterSpacing: 1.6,
                                color: cs.onSurfaceVariant,
                              ),
                            ),
                            const SizedBox(height: 12),
                            for (final paso in itinerario.take(5))
                              Padding(
                                padding: const EdgeInsets.only(bottom: 8),
                                child: Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    SizedBox(
                                      width: 52,
                                      child: Text(
                                        paso.hora,
                                        style: TextStyle(
                                          fontWeight: FontWeight.w800,
                                          fontSize: 12.5,
                                          color: cs.primary,
                                        ),
                                      ),
                                    ),
                                    Expanded(
                                      child: Text(
                                        paso.actividad,
                                        style: const TextStyle(fontSize: 13, height: 1.4),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            if (itinerario.length > 5)
                              Text(
                                '+ ${itinerario.length - 5} pasos más en la app',
                                style: TextStyle(fontSize: 12, color: cs.onSurfaceVariant),
                              ),
                          ],
                        ),
                      ),
                    ),
                  ],
                  const SizedBox(height: 24),
                  FilledButton(
                    onPressed: () => context.go('/reservas'),
                    child: const Text('Ver mis reservas'),
                  ),
                  const SizedBox(height: 8),
                  TextButton(
                    onPressed: () => context.go('/'),
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

  Widget _fila(BuildContext context, IconData icono, String texto) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Icon(icono, size: 16, color: Theme.of(context).colorScheme.onSurfaceVariant),
          const SizedBox(width: 10),
          Expanded(child: Text(texto, style: const TextStyle(fontSize: 13.5))),
        ],
      ),
    );
  }
}

/// Entrada escalonada: cada bloque aparece con un pequeño desplazamiento
/// vertical según su [paso], dentro de la misma animación (sin timers).
class _Aparecer extends StatelessWidget {
  const _Aparecer({required this.paso, required this.child});

  final int paso;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    const escalon = 0.14;
    final inicio = (paso * escalon).clamp(0.0, 0.72);
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: const Duration(milliseconds: 640),
      curve: Interval(inicio, (inicio + 0.42).clamp(0.0, 1.0), curve: Curves.easeOutCubic),
      builder: (context, t, child) => Opacity(
        opacity: t,
        child: Transform.translate(offset: Offset(0, 14 * (1 - t)), child: child),
      ),
      child: child,
    );
  }
}
