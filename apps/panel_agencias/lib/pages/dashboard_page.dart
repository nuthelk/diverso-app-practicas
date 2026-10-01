import 'package:flutter/material.dart';
import 'package:diverso_core/diverso_core.dart';

/// Tablero de la agencia: ventas, comisiones y próximos cupos.
class DashboardPage extends StatefulWidget {
  const DashboardPage({super.key, required this.agencia});

  final AgencyRef agencia;

  @override
  State<DashboardPage> createState() => _DashboardPageState();
}

class _DashboardPageState extends State<DashboardPage> {
  final _servicio = AgencyService();
  late Future<(List<VentaRow>, List<Plan>)> _future;

  @override
  void initState() {
    super.initState();
    _cargar();
  }

  void _cargar() {
    _future = () async {
      final ventas = await _servicio.ventas(widget.agencia.id);
      final planes = await _servicio.misPlanes(widget.agencia.id);
      return (ventas, planes);
    }();
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;

    return Scaffold(
      backgroundColor: cs.surfaceContainerLowest,
      body: RefreshIndicator(
        onRefresh: () async => _cargar(),
        child: FutureBuilder<(List<VentaRow>, List<Plan>)>(
          future: _future,
          builder: (context, snap) {
            if (snap.connectionState != ConnectionState.done) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snap.hasError) {
              return ListView(children: [
                const SizedBox(height: 120),
                Center(child: Text('Error: ${snap.error}')),
              ]);
            }
            final (ventas, planes) = snap.data!;

            final confirmadas =
                ventas.where((v) => v.bookingEstado == 'confirmada').toList();
            final totalVentas = confirmadas.fold<double>(0, (s, v) => s + v.montoTotal);
            final comision = confirmadas.fold<double>(0, (s, v) => s + v.comision);
            final saldo = confirmadas.fold<double>(0, (s, v) => s + v.saldoAgencia);

            final ahora = DateTime.now();
            final proximosCupos = <({DateTime fecha, String titulo, int cupos})>[];
            for (final p in planes) {
              for (final d in p.dates) {
                if (d.fecha.isAfter(ahora) && d.cupoDisponible > 0) {
                  proximosCupos.add((fecha: d.fecha, titulo: p.titulo, cupos: d.cupoDisponible));
                }
              }
            }
            proximosCupos.sort((a, b) => a.fecha.compareTo(b.fecha));

            return ListView(
              padding: const EdgeInsets.all(20),
              children: [
                Text('Hola, ${widget.agencia.nombre}',
                    style: Theme.of(context)
                        .textTheme
                        .headlineSmall
                        ?.copyWith(fontWeight: FontWeight.w800)),
                Text(
                  'Estado: ${_labelVerificacion(widget.agencia.estadoVerificacion)} · '
                  'Comisión Diverso: ${widget.agencia.comisionPct.toStringAsFixed(0)}%',
                  style: const TextStyle(color: Colors.black54),
                ),
                const SizedBox(height: 20),
                LayoutBuilder(builder: (context, cons) {
                  final ancho = cons.maxWidth;
                  final columnas = ancho > 900 ? 4 : (ancho > 600 ? 2 : 1);
                  final w = (ancho - 12 * (columnas - 1)) / columnas;
                  return Wrap(
                    spacing: 12,
                    runSpacing: 12,
                    children: [
                      _metrica(context, 'Ventas confirmadas',
                          formatCOP(totalVentas), Icons.payments, cs.primary),
                      _metrica(context, 'Comisión Diverso',
                          '- ${formatCOP(comision)}', Icons.percent, Colors.orange),
                      _metrica(context, 'Tu saldo a recibir',
                          formatCOP(saldo), Icons.account_balance_wallet, Colors.green),
                      _metrica(context, 'Reservas confirmadas',
                          '${confirmadas.length}', Icons.confirmation_number, cs.primary),
                    ].map((m) => SizedBox(width: w, child: m)).toList(),
                  );
                }),
                const SizedBox(height: 24),
                const Text('Próximas salidas con cupos',
                    style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                const SizedBox(height: 8),
                if (proximosCupos.isEmpty)
                  const Card(
                    child: Padding(
                      padding: EdgeInsets.all(14),
                      child: Text(
                          'No tienes fechas futuras con cupos. Agrega fechas en la pestaña Planes.'),
                    ),
                  )
                else
                  ...proximosCupos.take(8).map(
                        (c) => Card(
                          child: ListTile(
                            leading: CircleAvatar(
                              backgroundColor: c.cupos <= 3
                                  ? Colors.orange.shade100
                                  : cs.primaryContainer,
                              child: Text('${c.cupos}',
                                  style: const TextStyle(fontWeight: FontWeight.w700)),
                            ),
                            title: Text(c.titulo, maxLines: 1, overflow: TextOverflow.ellipsis),
                            subtitle: Text(formatFechaLarga(c.fecha)),
                            trailing: c.cupos <= 3
                                ? Text('¡Últimos cupos!',
                                    style: TextStyle(
                                        color: Colors.orange.shade800,
                                        fontWeight: FontWeight.w600))
                                : null,
                          ),
                        ),
                      ),
                const SizedBox(height: 24),
                const Text('Últimas ventas',
                    style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                const SizedBox(height: 8),
                if (ventas.isEmpty)
                  const Card(
                    child: Padding(
                      padding: EdgeInsets.all(14),
                      child: Text('Aún no tienes ventas registradas.'),
                    ),
                  )
                else
                  ...ventas.take(6).map(
                        (v) => Card(
                          child: ListTile(
                            leading: const Icon(Icons.receipt_long_outlined),
                            title: Text('${v.codigo} · ${v.planTitulo}',
                                maxLines: 1, overflow: TextOverflow.ellipsis),
                            subtitle: Text(
                              '${formatFechaCorta(v.fecha)} · ${v.pax} pax · '
                              'saldo agencia ${formatCOP(v.saldoAgencia)}',
                            ),
                            trailing: Text(formatCOP(v.montoTotal),
                                style: const TextStyle(fontWeight: FontWeight.w700)),
                          ),
                        ),
                      ),
              ],
            );
          },
        ),
      ),
    );
  }

  String _labelVerificacion(VerificationStatus e) => switch (e) {
        VerificationStatus.pendiente => 'En verificación',
        VerificationStatus.verificado => 'Verificada ✓',
        VerificationStatus.rechazado => 'Rechazada',
      };

  Widget _metrica(BuildContext context, String titulo, String valor, IconData icono,
      Color color) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration:
                  BoxDecoration(color: color.withValues(alpha: .12), shape: BoxShape.circle),
              child: Icon(icono, color: color, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(titulo,
                      style: const TextStyle(fontSize: 12, color: Colors.black54)),
                  Text(valor,
                      style: const TextStyle(
                          fontSize: 17, fontWeight: FontWeight.w800)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
