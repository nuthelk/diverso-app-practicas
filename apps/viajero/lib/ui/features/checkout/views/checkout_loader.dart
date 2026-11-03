import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../../router/app_routes.dart';
import '../../../core/widgets/feedback/empty_state.dart';
import '../view_models/checkout_plan_view_model.dart';
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
  late final CheckoutPlanViewModel _viewModel;

  @override
  void initState() {
    super.initState();
    _viewModel = CheckoutPlanViewModel(
      catalogo: context.read<CatalogRepository>(),
      planId: widget.planId,
      fechaId: widget.fechaId,
    )..cargar();
  }

  @override
  void dispose() {
    _viewModel.dispose();
    super.dispose();
  }

  Widget _estado(Widget hijo) => Scaffold(
    appBar: AppBar(title: const Text('Confirmar y pagar')),
    body: hijo,
  );

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: _viewModel,
      builder: (context, _) {
        final vm = _viewModel;
        if (vm.cargando) return _estado(const Center(child: CircularProgressIndicator()));
        final plan = vm.plan;
        if (vm.error != null || plan == null) {
          return _estado(
            EmptyState(
              icono: Icons.cloud_off_rounded,
              titulo: 'No pudimos cargar el plan',
              mensaje: 'Revisa tu conexión e intenta de nuevo.',
              accion: FilledButton.tonal(onPressed: vm.cargar, child: const Text('Reintentar')),
            ),
          );
        }
        final fecha = vm.fecha;
        if (fecha == null) {
          return _estado(
            EmptyState(
              icono: Icons.event_busy_rounded,
              titulo: 'Fecha no disponible',
              mensaje: 'Esa fecha ya no está disponible. Elige otra salida de este plan.',
              accion: FilledButton.tonal(
                onPressed: () => context.go(AppRoutes.plan(plan.id)),
                child: const Text('Ver fechas del plan'),
              ),
            ),
          );
        }
        return CheckoutView(plan: plan, fecha: fecha);
      },
    );
  }
}
