import 'package:flutter/material.dart';
import 'package:diverso_core/diverso_core.dart';

/// Conciliación de pagos: cada venta con su comisión retenida y el saldo
/// a dispersar a la agencia (modelo de comisión automática del Anexo 5).
class VentasPage extends StatefulWidget {
  const VentasPage({super.key, required this.agencia});

  final AgencyRef agencia;

  @override
  State<VentasPage> createState() => _VentasPageState();
}

class _VentasPageState extends State<VentasPage> {
  final _servicio = AgencyService();
  late Future<List<VentaRow>> _future;

  @override
  void initState() {
    super.initState();
    _cargar();
  }

  void _cargar() {
    setState(() {
      _future = _servicio.ventas(widget.agencia.id);
    });
  }

  Future<void> _refrescar() async {
    setState(() {
      _future = _servicio.ventas(widget.agencia.id);
    });
    await _future;
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;

    return Scaffold(
      backgroundColor: cs.surfaceContainerLowest,
      body: FutureBuilder<List<VentaRow>>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snap.hasError) {
            return Center(child: Text('Error: ${snap.error}'));
          }
          final ventas = snap.data ?? const [];
          if (ventas.isEmpty) {
            return const Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.receipt_long_outlined, size: 56, color: Colors.black26),
                  SizedBox(height: 12),
                  Text('Sin ventas todavía'),
                  Text('Cuando los viajeros reserven tus planes, verás aquí la conciliación.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Colors.black54)),
                ],
              ),
            );
          }

          final confirmadas = ventas.where((v) => v.bookingEstado == 'confirmada');
          final totalVentas = confirmadas.fold<double>(0, (s, v) => s + v.montoTotal);
          final totalComision = confirmadas.fold<double>(0, (s, v) => s + v.comision);
          final totalSaldo = confirmadas.fold<double>(0, (s, v) => s + v.saldoAgencia);

          final ancho = MediaQuery.of(context).size.width;
          final compacto = ancho < 1000;

          return RefreshIndicator(
            onRefresh: _refrescar,
            child: ListView(
              padding: const EdgeInsets.all(20),
              children: [
                Wrap(
                  spacing: 12,
                  runSpacing: 12,
                  children: [
                    _resumen('Ventas confirmadas', formatCOP(totalVentas)),
                    _resumen('Comisión Diverso (${widget.agencia.comisionPct.toStringAsFixed(0)}%)',
                        '- ${formatCOP(totalComision)}'),
                    _resumen('Saldo a recibir', formatCOP(totalSaldo)),
                  ],
                ),
                const SizedBox(height: 16),
                Card(
                  clipBehavior: Clip.antiAlias,
                  child: compacto
                      ? Column(
                          children: ventas.map(_tileVenta).toList(),
                        )
                      : SingleChildScrollView(
                          scrollDirection: Axis.horizontal,
                          child: DataTable(
                            columns: const [
                              DataColumn(label: Text('Código')),
                              DataColumn(label: Text('Plan')),
                              DataColumn(label: Text('Fecha')),
                              DataColumn(label: Text('Pax'), numeric: true),
                              DataColumn(label: Text('Monto'), numeric: true),
                              DataColumn(label: Text('Comisión'), numeric: true),
                              DataColumn(label: Text('Tu saldo'), numeric: true),
                              DataColumn(label: Text('Estado')),
                            ],
                            rows: ventas
                                .map((v) => DataRow(cells: [
                                      DataCell(SelectableText(v.codigo)),
                                      DataCell(SizedBox(
                                          width: 220,
                                          child: Text(v.planTitulo,
                                              maxLines: 1,
                                              overflow: TextOverflow.ellipsis))),
                                      DataCell(Text(formatFechaCorta(v.fecha))),
                                      DataCell(Text('${v.pax}')),
                                      DataCell(Text(formatCOP(v.montoTotal))),
                                      DataCell(Text('- ${formatCOP(v.comision)}')),
                                      DataCell(Text(formatCOP(v.saldoAgencia),
                                          style: const TextStyle(
                                              fontWeight: FontWeight.w700))),
                                      DataCell(_chipEstado(v)),
                                    ]))
                                .toList(),
                          ),
                        ),
                ),
                const SizedBox(height: 12),
                const Row(
                  children: [
                    Icon(Icons.info_outline, size: 15, color: Colors.black45),
                    SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        'Los pagos son simulados en el MVP. Con la pasarela real, el '
                        'motor retiene la comisión y dispersa el saldo a tu cuenta '
                        'sin intervención manual (Anexo 5).',
                        style: TextStyle(fontSize: 12, color: Colors.black45),
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

  Widget _resumen(String titulo, String valor) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(titulo, style: const TextStyle(fontSize: 12, color: Colors.black54)),
            Text(valor,
                style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
          ],
        ),
      ),
    );
  }

  Widget _tileVenta(VentaRow v) {
    return ListTile(
      dense: true,
      leading: _chipEstado(v),
      title: Text('${v.codigo} · ${v.planTitulo}',
          maxLines: 1, overflow: TextOverflow.ellipsis),
      subtitle: Text(
          '${formatFechaCorta(v.fecha)} · ${v.pax} pax · comisión ${formatCOP(v.comision)}'),
      trailing: Text(formatCOP(v.saldoAgencia),
          style: const TextStyle(fontWeight: FontWeight.w700)),
    );
  }

  Widget _chipEstado(VentaRow v) {
    final (color, texto) = switch (v.bookingEstado) {
      'confirmada' => (Colors.green.shade700, 'Confirmada'),
      'pendiente_pago' => (Colors.orange.shade800, 'Pendiente'),
      'cancelada' => (Colors.red.shade700, 'Cancelada'),
      'completada' => (Colors.blueGrey, 'Completada'),
      _ => (Colors.black54, v.bookingEstado),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: .12),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(texto,
          style: TextStyle(
              color: color, fontSize: 10, fontWeight: FontWeight.w700)),
    );
  }
}
