import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';

import '../../../core/theme/app_text.dart';
import '../../../core/widgets/page/cabecera_colapsable.dart';
import '../../../core/widgets/plan/paso_itinerario.dart';
import '../../../core/widgets/plan/tarjeta_cancelacion.dart';
import '../../../core/widgets/section_label.dart';
import 'acciones_detalle_reserva.dart';
import 'chip_codigo.dart';
import 'estado_reserva_pill.dart';
import 'foto_reserva.dart';
import 'resumen_reserva.dart';

/// Detalle de una reserva: cabecera colapsable con la foto, título, agencia, estado y código,
/// el resumen, el itinerario, la política de cancelación y las acciones.
class DetalleReserva extends StatelessWidget {
  const DetalleReserva({
    super.key,
    required this.booking,
    required this.puedeCancelar,
    required this.puedeResenar,
    required this.onVolver,
    required this.onCancelar,
    required this.onPagar,
    required this.onVerificar,
    required this.onResenar,
  });

  final Booking booking;
  final bool puedeCancelar;
  final bool puedeResenar;
  final VoidCallback onVolver;
  final VoidCallback onCancelar;
  final VoidCallback onPagar;
  final VoidCallback onVerificar;
  final VoidCallback onResenar;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final plan = booking.plan;
    final titulo = plan?.titulo ?? 'Plan';
    final agencia = plan?.agency?.nombre;

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          CabeceraColapsable(
            titulo: titulo,
            alturaExpandida: 240,
            onVolver: onVolver,
            fondo: FotoReserva(booking: booking),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: EdgeInsets.fromLTRB(22, 20, 22, 28 + MediaQuery.paddingOf(context).bottom),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    titulo,
                    style: const TextStyle(
                      fontSize: AppText.encabezadoXl,
                      fontWeight: FontWeight.w800,
                      height: 1.15,
                      letterSpacing: -.7,
                    ),
                  ),
                  if (agencia != null) ...[
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Icon(Icons.storefront_outlined, size: 16, color: cs.onSurfaceVariant),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            agencia,
                            style: TextStyle(
                              fontSize: AppText.cuerpo,
                              fontWeight: FontWeight.w600,
                              color: cs.onSurfaceVariant,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                  const SizedBox(height: 14),
                  Wrap(
                    spacing: 8,
                    runSpacing: 6,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      EstadoReservaPill(booking: booking),
                      ChipCodigo(codigo: booking.codigo),
                    ],
                  ),
                  const SizedBox(height: 18),
                  ResumenReserva(booking: booking),
                  if (plan != null && plan.itinerario.isNotEmpty) ...[
                    const SizedBox(height: 24),
                    const SectionLabel('Itinerario'),
                    ...plan.itinerario.map((paso) => PasoItinerario(paso: paso)),
                  ],
                  if (plan != null && plan.politicaCancelacion.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    TarjetaCancelacion(texto: plan.politicaCancelacion),
                  ],
                  const SizedBox(height: 24),
                  AccionesDetalleReserva(
                    booking: booking,
                    puedeCancelar: puedeCancelar,
                    puedeResenar: puedeResenar,
                    onCancelar: onCancelar,
                    onPagar: onPagar,
                    onVerificar: onVerificar,
                    onResenar: onResenar,
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
