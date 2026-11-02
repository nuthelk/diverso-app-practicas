import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../../router/app_routes.dart';
import '../../../core/widgets/feedback/empty_state.dart';
import '../../../core/widgets/page/titulo_pagina.dart';
import '../acciones_reserva.dart';
import '../view_models/bookings_view_model.dart';
import '../widgets/reservas_skeleton.dart';
import '../widgets/tarjeta_reserva.dart';

/// Mis reservas: próximas e historial con acciones de reseña y cancelación. El estado vive en
/// [BookingsViewModel] (MVVM).
class BookingsView extends StatefulWidget {
  const BookingsView({super.key});

  @override
  State<BookingsView> createState() => _BookingsViewState();
}

class _BookingsViewState extends State<BookingsView> with AutomaticKeepAliveClientMixin {
  late final BookingsViewModel _viewModel;
  late final PaymentGateway _pasarela;

  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    _viewModel = BookingsViewModel(reservas: context.read<BookingRepository>())
      ..addListener(_escucharAviso);
    _pasarela = context.read<PaymentGateway>();
    _viewModel.cargar();
  }

  @override
  void dispose() {
    _viewModel.removeListener(_escucharAviso);
    _viewModel.dispose();
    super.dispose();
  }

  void _escucharAviso() {
    if (mounted) mostrarAviso(context, _viewModel);
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    final cs = Theme.of(context).colorScheme;

    return DefaultTabController(
      length: 2,
      child: ListenableBuilder(
        listenable: _viewModel,
        builder: (context, _) {
          final vm = _viewModel;
          return Scaffold(
            // AppBar + TabBar fuera del área de la lista: las tarjetas no pueden pasar por encima.
            appBar: AppBar(
              title: const TituloPagina('Mis reservas'),
              bottom: TabBar(
                indicatorSize: TabBarIndicatorSize.label,
                labelColor: cs.primary,
                unselectedLabelColor: cs.onSurfaceVariant,
                indicatorWeight: 2.5,
                dividerColor: Colors.transparent,
                tabs: [
                  Tab(text: 'Próximas (${vm.activas.length})'),
                  Tab(text: 'Historial (${vm.historial.length})'),
                ],
              ),
            ),
            body: vm.cargando
                ? const ReservasSkeleton()
                : vm.error != null
                ? EmptyState(
                    icono: Icons.cloud_off_rounded,
                    titulo: 'Sin conexión',
                    mensaje: vm.error!,
                    accion: FilledButton.tonal(
                      onPressed: vm.cargar,
                      child: const Text('Reintentar'),
                    ),
                  )
                : vm.reservas.isEmpty
                ? const EmptyState(
                    icono: Icons.luggage_rounded,
                    titulo: 'Aún no tienes reservas',
                    mensaje:
                        'Cuando reserves un plan, aquí verás tu código, la fecha y el itinerario.',
                  )
                : TabBarView(
                    children: [
                      _lista(vm.activas, vacio: 'Sin viajes próximos — ¡hora de explorar!'),
                      _lista(vm.historial, vacio: 'Todavía no hay historial.', historial: true),
                    ],
                  ),
          );
        },
      ),
    );
  }

  Widget _lista(List<Booking> lista, {required String vacio, bool historial = false}) {
    if (lista.isEmpty) {
      return ListView(
        children: [
          const SizedBox(height: 120),
          Center(
            child: Text(
              vacio,
              style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant),
            ),
          ),
        ],
      );
    }
    return RefreshIndicator(
      onRefresh: _viewModel.cargar,
      child: ListView.builder(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
        itemCount: lista.length,
        itemBuilder: (context, i) => TarjetaReserva(
          booking: lista[i],
          historial: historial,
          // Solo se recarga si en el detalle cambió algo (cancelación, pago, reseña): así volver
          // de mirar una reserva no borra la lista ni pierde el desplazamiento.
          onAbrir: () => context
              .push<bool>(AppRoutes.reservaDetalle(lista[i].id), extra: lista[i])
              .then((cambio) {
                if (cambio == true) _viewModel.cargar();
              }),
          onResenar: _viewModel.puedeResenar(lista[i])
              ? () => context
                    .push(AppRoutes.resena(lista[i].id), extra: lista[i])
                    .then((_) => _viewModel.cargar())
              : null,
          onPagar: lista[i].estado == BookingStatus.pendientePago
              ? () => completarPago(context, _viewModel, _pasarela, lista[i])
              : null,
          onVerificar: lista[i].estado == BookingStatus.pendientePago
              ? () => context.go(AppRoutes.pagoDeReserva(lista[i].id))
              : null,
          onCancelar: _viewModel.puedeCancelar(lista[i])
              ? () => cancelarConConfirmacion(context, _viewModel, lista[i])
              : null,
        ),
      ),
    );
  }
}
