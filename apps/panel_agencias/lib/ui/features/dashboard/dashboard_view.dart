import 'package:flutter/material.dart';
import 'package:diverso_core/diverso_core.dart';

import '../../core/widgets.dart';
import '../shell/panel_controller.dart';

/// Dashboard: métricas de ventas/comisiones, próximas salidas y últimas ventas.
class DashboardView extends StatefulWidget {
  const DashboardView({super.key});

  @override
  State<DashboardView> createState() => _DashboardViewState();
}

class _DashboardViewState extends State<DashboardView> {
  final _controller = PanelController();

  @override
  void initState() {
    super.initState();
    _controller.cargarTodo();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: ListenableBuilder(
        listenable: _controller,
        builder: (context, _) {
          final c = _controller;
          if (c.cargando) {
            return ListView(
              padding: const EdgeInsets.all(28),
              children: const [
                Skeleton(width: 260, height: 26),
                SizedBox(height: 18),
                Skeleton(height: 92, radius: 20),
                SizedBox(height: 12),
                Skeleton(height: 92, radius: 20),
                SizedBox(height: 24),
                Skeleton(height: 60, radius: 20),
              ],
            );
          }
          if (c.error != null) {
            return EmptyState(
              icono: Icons.cloud_off_rounded,
              titulo: 'Sin conexión',
              mensaje: c.error!,
              detalle: c.errorDetalle,
              accion: FilledButton.tonal(onPressed: c.cargarTodo, child: const Text('Reintentar')),
            );
          }
          final a = c.agencia;
          if (a == null) return const SizedBox.shrink();

          final proximos = <({DateTime fecha, String titulo, int cupos})>[];
          for (final p in c.planes) {
            for (final d in p.dates) {
              if (d.fecha.isAfter(DateTime.now()) && d.cupoDisponible > 0) {
                proximos.add((fecha: d.fecha, titulo: p.titulo, cupos: d.cupoDisponible));
              }
            }
          }
          proximos.sort((x, y) => x.fecha.compareTo(y.fecha));

          return RefreshIndicator(
            onRefresh: c.cargarTodo,
            child: ListView(
              padding: const EdgeInsets.all(28),
              children: [
                Text(
                  'Hola, ${a.nombre}',
                  style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w800, letterSpacing: -.8),
                ),
                const SizedBox(height: 4),
                Text(
                  '${_labelEstado(a.estadoVerificacion)} · Comisión Diverso ${a.comisionPct.toStringAsFixed(0)}%',
                  style: TextStyle(fontSize: 13.5, color: cs.onSurfaceVariant),
                ),
                const SizedBox(height: 24),
                // Métricas responsivas
                LayoutBuilder(
                  builder: (context, constraints) {
                    final columnas = constraints.maxWidth > 1000
                        ? 4
                        : constraints.maxWidth > 560
                            ? 2
                            : 1;
                    final w = (constraints.maxWidth - 12 * (columnas - 1)) / columnas;
                    return Wrap(
                      spacing: 12,
                      runSpacing: 12,
                      children: [
                        SizedBox(
                          width: w,
                          child: StatCard(
                            icono: Icons.payments_rounded,
                            valor: formatCOP(c.ventasConfirmadas),
                            etiqueta: 'Ventas confirmadas',
                          ),
                        ),
                        SizedBox(
                          width: w,
                          child: StatCard(
                            icono: Icons.percent_rounded,
                            valor: '- ${formatCOP(c.comisionTotal)}',
                            etiqueta: 'Comisión Diverso',
                            color: Colors.orange.shade800,
                          ),
                        ),
                        SizedBox(
                          width: w,
                          child: StatCard(
                            icono: Icons.account_balance_wallet_rounded,
                            valor: formatCOP(c.saldoTotal),
                            etiqueta: 'Tu saldo a recibir',
                            color: const Color(0xFF1B7A4B),
                          ),
                        ),
                        SizedBox(
                          width: w,
                          child: StatCard(
                            icono: Icons.confirmation_number_rounded,
                            valor: '${c.reservasConfirmadas}',
                            etiqueta: 'Reservas confirmadas',
                          ),
                        ),
                      ],
                    );
                  },
                ),
                const SizedBox(height: 30),
                Text('PRÓXIMAS SALIDAS',
                    style: TextStyle(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 1.2,
                        color: cs.onSurfaceVariant)),
                const SizedBox(height: 12),
                if (proximos.isEmpty)
                  _caja(context, 'No tienes fechas futuras con cupos. Agrega fechas en la sección Planes.')
                else
                  ...proximos.take(6).map(
                        (s) => Padding(
                          padding: const EdgeInsets.only(bottom: 10),
                          child: Container(
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: cs.surfaceContainerLow,
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Row(
                              children: [
                                Container(
                                  width: 46,
                                  height: 46,
                                  alignment: Alignment.center,
                                  decoration: BoxDecoration(
                                    color: s.cupos <= 3
                                        ? Colors.orange.shade100
                                        : cs.primaryContainer,
                                    borderRadius: BorderRadius.circular(14),
                                  ),
                                  child: Text(
                                    '${s.cupos}',
                                    style: TextStyle(
                                      fontWeight: FontWeight.w800,
                                      fontSize: 16,
                                      color: s.cupos <= 3
                                          ? Colors.orange.shade900
                                          : cs.onPrimaryContainer,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 14),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(s.titulo,
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                                      const SizedBox(height: 2),
                                      Text(
                                        formatFechaLarga(s.fecha),
                                        style: TextStyle(fontSize: 12.5, color: cs.onSurfaceVariant),
                                      ),
                                    ],
                                  ),
                                ),
                                if (s.cupos <= 3)
                                  StatusPill('¡Últimos cupos!', color: Colors.orange.shade800),
                              ],
                            ),
                          ),
                        ),
                      ),
                const SizedBox(height: 24),
                Text('ÚLTIMAS VENTAS',
                    style: TextStyle(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 1.2,
                        color: cs.onSurfaceVariant)),
                const SizedBox(height: 12),
                if (c.ventas.isEmpty)
                  _caja(context, 'Aún no tienes ventas registradas.')
                else
                  ...c.ventas.take(6).map(
                        (v) => Padding(
                          padding: const EdgeInsets.only(bottom: 10),
                          child: Container(
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: cs.surfaceContainerLow,
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Row(
                              children: [
                                InitialsAvatar(v.codigo.replaceFirst('DIV-', ''), radius: 15),
                                const SizedBox(width: 13),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text('${v.codigo} · ${v.planTitulo}',
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5)),
                                      const SizedBox(height: 2),
                                      Text(
                                        '${formatFechaCorta(v.fecha)} · ${v.pax} pax · saldo ${formatCOP(v.saldoAgencia)}',
                                        style: TextStyle(fontSize: 12, color: cs.onSurfaceVariant),
                                      ),
                                    ],
                                  ),
                                ),
                                Text(
                                  formatCOP(v.montoTotal),
                                  style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14.5),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _caja(BuildContext context, String texto) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: cs.surfaceContainerLow,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(texto, style: TextStyle(color: cs.onSurfaceVariant, fontSize: 13.5)),
    );
  }

  String _labelEstado(VerificationStatus e) => switch (e) {
        VerificationStatus.pendiente => 'En verificación',
        VerificationStatus.verificado => 'Agencia verificada ✓',
        VerificationStatus.rechazado => 'Verificación rechazada',
      };
}
