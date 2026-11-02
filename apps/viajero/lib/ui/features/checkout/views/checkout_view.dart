import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../core/theme/app_radii.dart';
import '../../../core/widgets/section_label.dart';
import '../pago_wompi.dart';
import '../view_models/checkout_view_model.dart';
import '../widgets/pago_wompi_card.dart';
import '../widgets/reserva_pendiente_aviso.dart';

/// Checkout: resumen claro, personas, pago con Wompi (modo prueba) y total final —
/// todo en una pantalla, sin pasos innecesarios.
class CheckoutView extends StatefulWidget {
  const CheckoutView({super.key, required this.plan, required this.fecha});

  final Plan plan;
  final PlanDate fecha;

  @override
  State<CheckoutView> createState() => _CheckoutViewState();
}

class _CheckoutViewState extends State<CheckoutView> {
  late final CheckoutViewModel _controller;
  late final PaymentGateway _pasarela;

  @override
  void initState() {
    super.initState();
    _controller = CheckoutViewModel(reservas: context.read<BookingRepository>());
    _pasarela = context.read<PaymentGateway>();
    _controller.cargarPendiente(widget.fecha);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<bool> _abrirPago(String bookingId) =>
      iniciarPago(context, pasarela: _pasarela, bookingId: bookingId);

  Future<void> _pagar() => _controller.pagar(widget.fecha, _abrirPago);

  /// Fallback si la redirección no llegó: el servidor consulta a Wompi por la reserva.
  void _yaPague(String bookingId) =>
      context.go('${DiversoConfig.pagoResultadoPath}?reserva=$bookingId');

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final plan = widget.plan;
    final cupos = widget.fecha.cupoDisponible;

    return Scaffold(
      appBar: AppBar(title: const Text('Confirmar y pagar')),
      body: ListenableBuilder(
        listenable: _controller,
        builder: (context, _) {
          final c = _controller;
          return Stack(
            children: [
              ListView(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 200),
                children: [
                  // Reserva pendiente de esta fecha (p. ej. volvió atrás desde Wompi) --------
                  if (c.pendiente != null) ...[
                    ReservaPendienteAviso(
                      reserva: c.pendiente!,
                      ocupado: c.procesando,
                      onCompletar: () => c.completarPendiente(_abrirPago),
                      onVerificar: () => _yaPague(c.pendiente!.id),
                      onCancelar: c.cancelarPendiente,
                    ),
                    const SizedBox(height: 16),
                  ],
                  // Resumen del plan -----------------------------------------
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: cs.surfaceContainerLow,
                      borderRadius: BorderRadius.circular(AppRadios.card),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 64,
                          height: 64,
                          clipBehavior: Clip.antiAlias,
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(14),
                            color: cs.primaryContainer,
                            image: plan.fotoPrincipal == null
                                ? null
                                : DecorationImage(
                                    image: NetworkImage(plan.fotoPrincipal!),
                                    fit: BoxFit.cover,
                                  ),
                          ),
                          child: plan.fotoPrincipal == null
                              ? Center(
                                  child: Text(
                                    plan.categoria.emoji,
                                    style: const TextStyle(fontSize: 24),
                                  ),
                                )
                              : null,
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                plan.titulo,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w700,
                                  fontSize: 15,
                                  height: 1.25,
                                ),
                              ),
                              const SizedBox(height: 5),
                              Text(
                                '${formatFechaLarga(widget.fecha.fecha)} · ${plan.destino}',
                                style: TextStyle(fontSize: 12.5, color: cs.onSurfaceVariant),
                              ),
                              if (plan.puntoEncuentro.isNotEmpty)
                                Text(
                                  plan.puntoEncuentro,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(fontSize: 12, color: cs.onSurfaceVariant),
                                ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 22),

                  // Personas ---------------------------------------------------
                  const SectionLabel('Personas'),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    decoration: BoxDecoration(
                      color: cs.surfaceContainerLow,
                      borderRadius: BorderRadius.circular(AppRadios.card),
                    ),
                    child: Row(
                      children: [
                        const Expanded(
                          child: Text(
                            '¿Cuántos viajan?',
                            style: TextStyle(fontWeight: FontWeight.w600),
                          ),
                        ),
                        _BotonPax(
                          icono: Icons.remove_rounded,
                          habilitado: c.bookingId == null && c.pendiente == null && c.pax > 1,
                          onTap: () => c.setPax(c.pax - 1),
                        ),
                        SizedBox(
                          width: 52,
                          child: Text(
                            '${c.pax}',
                            textAlign: TextAlign.center,
                            style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w800),
                          ),
                        ),
                        _BotonPax(
                          icono: Icons.add_rounded,
                          habilitado:
                              c.bookingId == null &&
                              c.pendiente == null &&
                              c.pax < cupos &&
                              c.pax < 20,
                          onTap: () => c.setPax(c.pax + 1),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    '$cupos cupos disponibles para esta fecha',
                    style: TextStyle(fontSize: 12, color: cs.onSurfaceVariant),
                  ),
                  const SizedBox(height: 22),

                  // Pago con Wompi (modo prueba) ---------------------------------
                  const SectionLabel('Pago'),
                  const PagoWompiCard(),
                  const SizedBox(height: 22),

                  // Resumen de pago --------------------------------------------
                  const SectionLabel('Resumen'),
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: cs.surfaceContainerLow,
                      borderRadius: BorderRadius.circular(AppRadios.card),
                    ),
                    child: Column(
                      children: [
                        _LineaPago('Precio por persona', formatCOP(plan.precioCop)),
                        _LineaPago('Personas', '${c.pax}'),
                        const Padding(padding: EdgeInsets.symmetric(vertical: 8), child: Divider()),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text(
                              'Total a pagar',
                              style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                            ),
                            Text(
                              formatCOP(c.total(plan)),
                              style: TextStyle(
                                fontSize: 19,
                                fontWeight: FontWeight.w800,
                                letterSpacing: -.4,
                                color: cs.primary,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Row(
                          children: [
                            Icon(Icons.lock_outline_rounded, size: 12, color: cs.outline),
                            const SizedBox(width: 5),
                            Text(
                              'Precio final, sin cargos ocultos',
                              style: TextStyle(fontSize: 11.5, color: cs.outline),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  if (c.error != null) ...[
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: cs.errorContainer,
                        borderRadius: BorderRadius.circular(AppRadios.card),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.error_outline_rounded, color: cs.onErrorContainer),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              c.error!,
                              style: TextStyle(color: cs.onErrorContainer, fontSize: 13.5),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                  if (c.bookingId != null) ...[
                    const SizedBox(height: 10),
                    OutlinedButton.icon(
                      onPressed: c.procesando ? null : () => _yaPague(c.bookingId!),
                      icon: const Icon(Icons.refresh_rounded, size: 18),
                      label: const Text('Ya pagué, verificar'),
                    ),
                  ],
                ],
              ),
              // Barra inferior con total + CTA --------------------------------
              Positioned(
                left: 0,
                right: 0,
                bottom: 0,
                child: Container(
                  padding: EdgeInsets.fromLTRB(
                    20,
                    12,
                    20,
                    14 + MediaQuery.viewInsetsOf(context).bottom,
                  ),
                  decoration: BoxDecoration(
                    color: Theme.of(context).scaffoldBackgroundColor,
                    border: Border(top: BorderSide(color: cs.outlineVariant.withValues(alpha: .5))),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              formatCOP(c.total(plan)),
                              style: TextStyle(
                                fontSize: 21,
                                fontWeight: FontWeight.w800,
                                letterSpacing: -.5,
                                color: cs.onSurface,
                              ),
                            ),
                            Text(
                              'total por ${c.pax} ${c.pax == 1 ? 'persona' : 'personas'}',
                              style: TextStyle(fontSize: 11, color: cs.onSurfaceVariant),
                            ),
                          ],
                        ),
                      ),
                      SizedBox(
                        width: 220,
                        child: FilledButton.icon(
                          onPressed: c.procesando || c.pendiente != null ? null : _pagar,
                          icon: c.procesando
                              ? const SizedBox(
                                  height: 17,
                                  width: 17,
                                  child: CircularProgressIndicator(strokeWidth: 2),
                                )
                              : const Icon(Icons.lock_rounded, size: 17),
                          label: Text(c.procesando ? 'Procesando…' : 'Pagar con Wompi'),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _BotonPax extends StatelessWidget {
  const _BotonPax({required this.icono, required this.habilitado, required this.onTap});

  final IconData icono;
  final bool habilitado;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return IconButton.outlined(
      style: IconButton.styleFrom(
        minimumSize: const Size(38, 38),
        maximumSize: const Size(38, 38),
        side: BorderSide(color: habilitado ? cs.primary : cs.outlineVariant),
        foregroundColor: habilitado ? cs.primary : cs.outline,
      ),
      tooltip: icono == Icons.remove_rounded ? 'Quitar una persona' : 'Agregar una persona',
      onPressed: habilitado ? onTap : null,
      icon: Icon(icono, size: 18),
    );
  }
}

class _LineaPago extends StatelessWidget {
  const _LineaPago(this.etiqueta, this.valor);

  final String etiqueta;
  final String valor;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            etiqueta,
            style: TextStyle(fontSize: 13.5, color: Theme.of(context).colorScheme.onSurfaceVariant),
          ),
          Text(valor, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13.5)),
        ],
      ),
    );
  }
}
