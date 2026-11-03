import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';

import '../../../core/theme/app_insets.dart';
import '../../../core/theme/app_text.dart';
import '../reserva_formato.dart';
import 'color_reembolso.dart';
import 'encabezado_reserva.dart';
import 'fila_dato.dart';

/// Tarjeta de una reserva, tocable (abre el detalle): foto del plan como cabecera con la fecha de
/// salida, el estado y el código encima; debajo el título y la agencia, los datos que importan
/// (salida con su cuenta regresiva y punto de encuentro), el reembolso, un pie con personas y
/// total, y las acciones. Sin foto, la cabecera usa un respaldo de color con el ícono de la
/// categoría. El historial se ve más apagado.
class TarjetaReserva extends StatelessWidget {
  const TarjetaReserva({
    super.key,
    required this.booking,
    required this.onAbrir,
    this.historial = false,
    this.onResenar,
    this.onCancelar,
    this.onPagar,
    this.onVerificar,
  });

  final Booking booking;
  final VoidCallback onAbrir;
  final bool historial;
  final VoidCallback? onResenar;
  final VoidCallback? onCancelar;
  final VoidCallback? onPagar;
  final VoidCallback? onVerificar;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final agencia = booking.plan?.agency?.nombre;
    final salida = textoSalida(booking);
    final puntoEncuentro = booking.plan?.puntoEncuentro ?? '';
    final colorTexto = historial ? cs.onSurface.withValues(alpha: .72) : cs.onSurface;

    return Padding(
      padding: AppInsets.entreTarjetas,
      child: Card(
        color: cs.surfaceContainerLow,
        clipBehavior: Clip.antiAlias,
        child: Semantics(
          button: true,
          label: 'Ver detalle de la reserva ${booking.codigo}',
          child: InkWell(
            onTap: onAbrir,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                EncabezadoReserva(booking: booking, apagado: historial),
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        booking.plan?.titulo ?? 'Plan',
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: AppText.subtitulo,
                          height: 1.25,
                          color: colorTexto,
                        ),
                      ),
                      if (agencia != null) ...[
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            Icon(Icons.storefront_outlined, size: 14, color: cs.onSurfaceVariant),
                            const SizedBox(width: 5),
                            Expanded(
                              child: Text(
                                agencia,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  fontSize: AppText.leyendaGrande,
                                  fontWeight: FontWeight.w600,
                                  color: cs.onSurfaceVariant,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                      const SizedBox(height: 12),
                      if (salida != null)
                        FilaDato(
                          icono: Icons.event_rounded,
                          texto: salida,
                          acento: cuentaRegresiva(booking),
                          compacto: true,
                        ),
                      if (puntoEncuentro.isNotEmpty) ...[
                        const SizedBox(height: 6),
                        FilaDato(
                          icono: Icons.place_outlined,
                          texto: puntoEncuentro,
                          compacto: true,
                        ),
                      ],
                      if (booking.etiquetaReembolso != null) ...[
                        const SizedBox(height: 6),
                        FilaDato(
                          icono: Icons.currency_exchange_rounded,
                          texto: booking.etiquetaReembolso!,
                          color: colorReembolso(booking, cs),
                          compacto: true,
                        ),
                      ],
                      const SizedBox(height: 12),
                      Divider(height: 1, color: cs.outlineVariant),
                      const SizedBox(height: 12),
                      // Wrap: con letra muy grande el total baja a su propia línea en vez de desbordar.
                      Wrap(
                        alignment: WrapAlignment.spaceBetween,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        spacing: 12,
                        runSpacing: 4,
                        children: [
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.group_outlined, size: 16, color: cs.onSurfaceVariant),
                              const SizedBox(width: 6),
                              Text(
                                textoPersonas(booking.pax),
                                style: TextStyle(
                                  fontSize: AppText.detalle,
                                  color: cs.onSurfaceVariant,
                                ),
                              ),
                            ],
                          ),
                          Text(
                            formatCOP(booking.montoTotal),
                            style: TextStyle(
                              fontSize: AppText.subtituloGrande,
                              fontWeight: FontWeight.w800,
                              letterSpacing: -.3,
                              color: colorTexto,
                            ),
                          ),
                        ],
                      ),
                      if (onPagar != null || onVerificar != null) ...[
                        const SizedBox(height: 10),
                        Wrap(
                          alignment: WrapAlignment.end,
                          spacing: 8,
                          runSpacing: 4,
                          children: [
                            if (onVerificar != null)
                              TextButton(
                                onPressed: onVerificar,
                                child: const Text('Ya pagué, verificar'),
                              ),
                            if (onPagar != null)
                              FilledButton.tonal(
                                style: FilledButton.styleFrom(minimumSize: const Size(0, 38)),
                                onPressed: onPagar,
                                child: const Text('Completar pago'),
                              ),
                          ],
                        ),
                      ],
                      if (onResenar != null || onCancelar != null) ...[
                        const SizedBox(height: 10),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.end,
                          children: [
                            if (onResenar != null)
                              FilledButton.tonalIcon(
                                style: FilledButton.styleFrom(
                                  minimumSize: const Size(0, 38),
                                  padding: const EdgeInsets.symmetric(horizontal: 14),
                                ),
                                onPressed: onResenar,
                                icon: const Icon(Icons.star_outline_rounded, size: 16),
                                label: const Text('Reseñar'),
                              ),
                            if (onCancelar != null) ...[
                              if (onResenar != null) const SizedBox(width: 8),
                              TextButton(
                                style: TextButton.styleFrom(
                                  foregroundColor: cs.error,
                                  minimumSize: const Size(0, 38),
                                ),
                                onPressed: onCancelar,
                                child: const Text('Cancelar'),
                              ),
                            ],
                          ],
                        ),
                      ] else if (booking.tieneResena) ...[
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            Icon(Icons.rate_review_rounded, size: 13, color: cs.primary),
                            const SizedBox(width: 4),
                            Text(
                              'Ya dejaste tu reseña',
                              style: TextStyle(fontSize: AppText.leyenda, color: cs.primary),
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
