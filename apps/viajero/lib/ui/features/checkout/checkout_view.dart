import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:diverso_core/diverso_core.dart';

import '../../core/app_theme.dart';
import '../../core/widgets.dart';
import 'checkout_controller.dart';

/// Checkout: resumen claro, personas, medio de pago local y total final —
/// todo en una pantalla, sin pasos innecesarios.
class CheckoutView extends StatefulWidget {
  const CheckoutView({super.key, required this.plan, required this.fecha});

  final Plan plan;
  final PlanDate fecha;

  @override
  State<CheckoutView> createState() => _CheckoutViewState();
}

class _CheckoutViewState extends State<CheckoutView> {
  final _controller = CheckoutController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _pagar() async {
    final resultado = await _controller.pagar(widget.plan, widget.fecha);
    if (!mounted || resultado == null) return;
    context.pushReplacement('/exito', extra: resultado);
  }

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
                              ? Center(child: Text(plan.categoria.emoji, style: const TextStyle(fontSize: 24)))
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
                                style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15, height: 1.25),
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
                        const Expanded(child: Text('¿Cuántos viajan?', style: TextStyle(fontWeight: FontWeight.w600))),
                        _BotonPax(
                          icono: Icons.remove_rounded,
                          habilitado: c.pax > 1,
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
                          habilitado: c.pax < cupos && c.pax < 20,
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

                  // Medio de pago ----------------------------------------------
                  const SectionLabel('Medio de pago'),
                  ...PaymentMethodOption.values.map((m) {
                    final sel = m == c.metodo;
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: _OpcionPago(
                        metodo: m,
                        seleccionada: sel,
                        onTap: () => c.setMetodo(m),
                      ),
                    );
                  }),
                  Padding(
                    padding: const EdgeInsets.only(left: 4),
                    child: Row(
                      children: [
                        Icon(Icons.shield_outlined, size: 14, color: cs.tertiary),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            'Compra protegida con garantía de reembolso. Modo demo: pago simulado.',
                            style: TextStyle(fontSize: 12, color: cs.onSurfaceVariant),
                          ),
                        ),
                      ],
                    ),
                  ),
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
                            const Text('Total a pagar',
                                style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
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
                ],
              ),
              // Barra inferior con total + CTA --------------------------------
              Positioned(
                left: 0,
                right: 0,
                bottom: 0,
                child: Container(
                  padding: EdgeInsets.fromLTRB(20, 12, 20, 14 + MediaQuery.viewInsetsOf(context).bottom),
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
                              style: const TextStyle(fontSize: 11, color: Colors.black45),
                            ),
                          ],
                        ),
                      ),
                      SizedBox(
                        width: 190,
                        child: FilledButton.icon(
                          onPressed: c.procesando ? null : _pagar,
                          icon: c.procesando
                              ? const SizedBox(
                                  height: 17,
                                  width: 17,
                                  child: CircularProgressIndicator(strokeWidth: 2),
                                )
                              : const Icon(Icons.lock_rounded, size: 17),
                          label: Text(c.procesando ? 'Procesando…' : 'Pagar'),
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

class _OpcionPago extends StatelessWidget {
  const _OpcionPago({required this.metodo, required this.seleccionada, required this.onTap});

  final PaymentMethodOption metodo;
  final bool seleccionada;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final icono = switch (metodo) {
      PaymentMethodOption.pse => Icons.account_balance_rounded,
      PaymentMethodOption.nequi => Icons.smartphone_rounded,
      PaymentMethodOption.daviplata => Icons.phone_iphone_rounded,
      PaymentMethodOption.tarjeta => Icons.credit_card_rounded,
    };

    return AnimatedContainer(
      duration: const Duration(milliseconds: 160),
      curve: Curves.easeOut,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
      decoration: BoxDecoration(
        color: seleccionada ? cs.primaryContainer : cs.surfaceContainerLow,
        borderRadius: BorderRadius.circular(AppRadios.card),
        border: Border.fromBorderSide(
          BorderSide(
            color: seleccionada ? cs.primary : Colors.transparent,
            width: 1.5,
          ),
        ),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(AppRadios.card),
        onTap: onTap,
        child: Row(
          children: [
            Icon(icono, size: 21, color: seleccionada ? cs.primary : cs.onSurfaceVariant),
            const SizedBox(width: 13),
            Expanded(
              child: Text(
                metodo.label,
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: seleccionada ? FontWeight.w700 : FontWeight.w600,
                  color: seleccionada ? cs.onPrimaryContainer : cs.onSurface,
                ),
              ),
            ),
            AnimatedScale(
              duration: const Duration(milliseconds: 140),
              scale: seleccionada ? 1 : 0,
              child: Icon(Icons.check_circle_rounded, color: cs.primary),
            ),
          ],
        ),
      ),
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
          Text(etiqueta, style: TextStyle(fontSize: 13.5, color: Theme.of(context).colorScheme.onSurfaceVariant)),
          Text(valor, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13.5)),
        ],
      ),
    );
  }
}
