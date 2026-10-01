import 'package:flutter/material.dart';
import 'package:diverso_core/diverso_core.dart';

import '../../core/widgets.dart';
import '../shell/panel_controller.dart';

/// Conciliación de pagos: comisión retenida y saldo a recibir por venta
/// (motor de comisión automática del Anexo 5).
class VentasView extends StatefulWidget {
  const VentasView({super.key});

  @override
  State<VentasView> createState() => _VentasViewState();
}

class _VentasViewState extends State<VentasView> {
  final _controller = PanelController();
  int _filtro = 0; // 0 todas · 1 confirmadas · 2 pendientes

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
              children: List.generate(
                5,
                (_) => const Padding(
                  padding: EdgeInsets.only(bottom: 10),
                  child: Skeleton(height: 52, radius: 14),
                ),
              ),
            );
          }
          if (c.error != null) {
            return EmptyState(
              icono: Icons.cloud_off_rounded,
              titulo: 'Sin conexión',
              mensaje: c.error!,
              detalle: c.errorDetalle,
              accion: FilledButton.tonal(
                onPressed: c.cargarTodo,
                child: const Text('Reintentar'),
              ),
            );
          }

          final todas = c.ventas;
          final filtradas = switch (_filtro) {
            1 => todas.where((v) => v.bookingEstado == 'confirmada').toList(),
            2 =>
              todas.where((v) => v.bookingEstado == 'pendiente_pago').toList(),
            _ => todas,
          };

          return RefreshIndicator(
            onRefresh: c.cargarTodo,
            child: ListView(
              padding: const EdgeInsets.all(28),
              children: [
                // Cabecera compacta: título a la izquierda, filtro a la derecha.
                LayoutBuilder(
                  builder: (context, constraints) {
                    final filtro = SegmentedButton<int>(
                      segments: const [
                        ButtonSegment(value: 0, label: Text('Todas')),
                        ButtonSegment(value: 1, label: Text('Confirmadas')),
                        ButtonSegment(value: 2, label: Text('Pendientes')),
                      ],
                      selected: {_filtro},
                      onSelectionChanged: (s) =>
                          setState(() => _filtro = s.first),
                      style: const ButtonStyle(
                        visualDensity: VisualDensity(
                          horizontal: -3,
                          vertical: -2,
                        ),
                        side: WidgetStatePropertyAll(BorderSide(width: .8)),
                      ),
                    );
                    final titulo = Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Ventas y conciliación',
                          style: const TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.w800,
                            letterSpacing: -.8,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'El motor retiene la comisión de Diverso y dispersa el saldo a tu cuenta '
                          'sin intervención manual.',
                          style: TextStyle(
                            fontSize: 13,
                            color: cs.onSurfaceVariant,
                          ),
                        ),
                      ],
                    );
                    if (constraints.maxWidth > 760) {
                      return Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(child: titulo),
                          const SizedBox(width: 16),
                          filtro,
                        ],
                      );
                    }
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [titulo, const SizedBox(height: 14), filtro],
                    );
                  },
                ),
                const SizedBox(height: 18),
                // Resumen
                Wrap(
                  spacing: 12,
                  runSpacing: 12,
                  children: [
                    _resumen(
                      'Ventas confirmadas',
                      formatCOP(c.ventasConfirmadas),
                      cs.primary,
                    ),
                    _resumen(
                      'Comisión (${c.agencia?.comisionPct.toStringAsFixed(0) ?? '12'}%)',
                      '- ${formatCOP(c.comisionTotal)}',
                      Colors.orange.shade800,
                    ),
                    _resumen(
                      'Saldo a recibir',
                      formatCOP(c.saldoTotal),
                      const Color(0xFF1B7A4B),
                    ),
                  ],
                ),
                const SizedBox(height: 18),
                if (filtradas.isEmpty)
                  EmptyState(
                    icono: Icons.receipt_long_rounded,
                    titulo: 'Sin ventas aquí',
                    mensaje:
                        'Cuando los viajeros reserven tus planes, verás la conciliación en esta pantalla.',
                  )
                else
                  LayoutBuilder(
                    builder: (context, constraints) {
                      // Tabla en anchura suficiente; tarjetas en compacto.
                      if (constraints.maxWidth > 860) {
                        return Container(
                          clipBehavior: Clip.antiAlias,
                          decoration: BoxDecoration(
                            color: cs.surfaceContainerLow,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: cs.outlineVariant.withValues(alpha: .4),
                            ),
                          ),
                          child: SingleChildScrollView(
                            scrollDirection: Axis.horizontal,
                            // La tabla estira sus columnas hasta ocupar todo
                            // el ancho disponible; el scroll solo entra en
                            // juego si el contenido mínimo no cabe.
                            child: ConstrainedBox(
                              constraints: BoxConstraints(
                                minWidth: constraints.maxWidth - 2,
                              ),
                              child: DataTable(
                                columnSpacing: 12,
                                headingRowColor: WidgetStatePropertyAll(
                                  cs.surfaceContainerHighest.withValues(
                                    alpha: .45,
                                  ),
                                ),
                                headingTextStyle: TextStyle(
                                  fontSize: 11.5,
                                  fontWeight: FontWeight.w700,
                                  letterSpacing: .8,
                                  color: cs.onSurfaceVariant,
                                ),
                                columns: const [
                                  DataColumn(label: Text('CÓDIGO')),
                                  DataColumn(label: Text('PLAN')),
                                  DataColumn(label: Text('FECHA')),
                                  DataColumn(label: Text('PAX'), numeric: true),
                                  DataColumn(
                                    label: Text('MONTO'),
                                    numeric: true,
                                  ),
                                  DataColumn(
                                    label: Text('COMISIÓN'),
                                    numeric: true,
                                  ),
                                  DataColumn(
                                    label: Text('SALDO'),
                                    numeric: true,
                                  ),
                                  DataColumn(label: Text('ESTADO')),
                                ],
                                rows: filtradas
                                    .map(
                                      (v) => DataRow(
                                        cells: [
                                          DataCell(SelectableText(v.codigo)),
                                          DataCell(
                                            SizedBox(
                                              width: 170,
                                              child: Text(
                                                v.planTitulo,
                                                maxLines: 1,
                                                overflow: TextOverflow.ellipsis,
                                              ),
                                            ),
                                          ),
                                          DataCell(
                                            Text(formatFechaCorta(v.fecha)),
                                          ),
                                          DataCell(Text('${v.pax}')),
                                          DataCell(
                                            Text(formatCOP(v.montoTotal)),
                                          ),
                                          DataCell(
                                            Text(
                                              '- ${formatCOP(v.comision)}',
                                              style: TextStyle(
                                                color: Colors.orange.shade800,
                                              ),
                                            ),
                                          ),
                                          DataCell(
                                            Text(
                                              formatCOP(v.saldoAgencia),
                                              style: const TextStyle(
                                                fontWeight: FontWeight.w800,
                                              ),
                                            ),
                                          ),
                                          DataCell(
                                            StatusPill.estado(v.bookingEstado),
                                          ),
                                        ],
                                      ),
                                    )
                                    .toList(),
                              ),
                            ),
                          ),
                        );
                      }
                      return Column(
                        children: filtradas
                            .map(
                              (v) => Padding(
                                padding: const EdgeInsets.only(bottom: 10),
                                child: Container(
                                  padding: const EdgeInsets.all(14),
                                  decoration: BoxDecoration(
                                    color: cs.surfaceContainerLow,
                                    borderRadius: BorderRadius.circular(20),
                                  ),
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        children: [
                                          Text(
                                            v.codigo,
                                            style: const TextStyle(
                                              fontWeight: FontWeight.w800,
                                              fontSize: 13.5,
                                              letterSpacing: .5,
                                            ),
                                          ),
                                          const Spacer(),
                                          StatusPill.estado(v.bookingEstado),
                                        ],
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        v.planTitulo,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: TextStyle(
                                          fontSize: 13,
                                          color: cs.onSurfaceVariant,
                                        ),
                                      ),
                                      const SizedBox(height: 6),
                                      Text(
                                        '${formatFechaCorta(v.fecha)} · ${v.pax} pax · '
                                        'comisión ${formatCOP(v.comision)}',
                                        style: TextStyle(
                                          fontSize: 12,
                                          color: cs.onSurfaceVariant,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Row(
                                        children: [
                                          Text(
                                            'Saldo ${formatCOP(v.saldoAgencia)}',
                                            style: const TextStyle(
                                              fontWeight: FontWeight.w700,
                                              fontSize: 13.5,
                                            ),
                                          ),
                                          const Spacer(),
                                          Text(
                                            formatCOP(v.montoTotal),
                                            style: const TextStyle(
                                              fontWeight: FontWeight.w800,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            )
                            .toList(),
                      );
                    },
                  ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Icon(
                      Icons.info_outline_rounded,
                      size: 14,
                      color: cs.outline,
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        'Pagos simulados en el MVP. Con la pasarela real (Wompi/PayU), '
                        'la dispersión del saldo será automática.',
                        style: TextStyle(fontSize: 12, color: cs.outline),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _resumen(String titulo, String valor, Color color) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
      decoration: BoxDecoration(
        color: cs.surfaceContainerLow,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            titulo,
            style: TextStyle(fontSize: 12, color: cs.onSurfaceVariant),
          ),
          const SizedBox(height: 3),
          Text(
            valor,
            style: TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w800,
              color: color,
              letterSpacing: -.3,
            ),
          ),
        ],
      ),
    );
  }
}
