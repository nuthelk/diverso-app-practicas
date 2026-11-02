import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/widgets.dart';
import 'checkout_view.dart';

/// `/checkout/:planId/:fechaId`: carga el plan y la fecha por id desde el backend, así la
/// pantalla se reconstruye igual tras recargar la página en web (sin `state.extra`).
class CheckoutLoader extends StatefulWidget {
  const CheckoutLoader({super.key, required this.planId, required this.fechaId});

  final String planId;
  final String fechaId;

  @override
  State<CheckoutLoader> createState() => _CheckoutLoaderState();
}

class _CheckoutLoaderState extends State<CheckoutLoader> {
  late Future<Plan> _plan;

  @override
  void initState() {
    super.initState();
    _cargar();
  }

  void _cargar() => _plan = context.read<CatalogService>().planDetalle(widget.planId);

  Widget _estado(Widget hijo) => Scaffold(
    appBar: AppBar(title: const Text('Confirmar y pagar')),
    body: hijo,
  );

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<Plan>(
      future: _plan,
      builder: (context, snap) {
        if (snap.connectionState != ConnectionState.done) {
          return _estado(const Center(child: CircularProgressIndicator()));
        }
        if (snap.hasError) {
          return _estado(
            EmptyState(
              icono: Icons.cloud_off_rounded,
              titulo: 'No pudimos cargar el plan',
              mensaje: 'Revisa tu conexión e intenta de nuevo.',
              accion: FilledButton.tonal(
                onPressed: () => setState(_cargar),
                child: const Text('Reintentar'),
              ),
            ),
          );
        }
        final plan = snap.data!;
        final fechas = plan.dates.where((d) => d.id == widget.fechaId && !plan.yaSalio(d));
        if (fechas.isEmpty) {
          return _estado(
            EmptyState(
              icono: Icons.event_busy_rounded,
              titulo: 'Fecha no disponible',
              mensaje: 'Esa fecha ya no está disponible. Elige otra salida de este plan.',
              accion: FilledButton.tonal(
                onPressed: () => context.go('/plan/${plan.id}'),
                child: const Text('Ver fechas del plan'),
              ),
            ),
          );
        }
        return CheckoutView(plan: plan, fecha: fechas.first);
      },
    );
  }
}
