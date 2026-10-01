import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:diverso_core/diverso_core.dart';

import '../../core/widgets.dart';
import '../shell/panel_controller.dart';

/// Dashboard: cabecera fija con saludo y CTA; métricas, ocupación semanal,
/// próximas salidas y últimas ventas en el scroll.
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
                Skeleton(width: 260, height: 30),
                SizedBox(height: 20),
                Skeleton(height: 116, radius: 22),
                SizedBox(height: 14),
                Skeleton(height: 116, radius: 22),
                SizedBox(height: 14),
                Skeleton(height: 116, radius: 22),
                SizedBox(height: 14),
                Skeleton(height: 150, radius: 22),
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

          final hoy0 = _hoy0();
          final proximos = _proximasSalidas(c.planes, hoy0);

          return Column(
            children: [
              // Cabecera fija (fuera del scroll, como todo dashboard).
              Padding(
                padding: const EdgeInsets.fromLTRB(28, 24, 28, 0),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Hola, ${a.nombre}',
                            style: const TextStyle(
                                fontSize: 26, fontWeight: FontWeight.w800, letterSpacing: -.8),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '${_labelEstado(a.estadoVerificacion)} · Comisión Diverso ${a.comisionPct.toStringAsFixed(0)}%',
                            style: TextStyle(fontSize: 13.5, color: cs.onSurfaceVariant),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 16),
                    FilledButton.icon(
                      onPressed: () => context.go('/planes/nuevo'),
                      icon: const Icon(Icons.add_rounded, size: 19),
                      label: const Text('Nuevo plan'),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              Expanded(
                child: RefreshIndicator(
                  onRefresh: c.cargarTodo,
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(28, 0, 28, 28),
                    children: [
                      // Métricas ------------------------------------------------
                      LayoutBuilder(
                        builder: (context, constraints) {
                          final columnas = constraints.maxWidth > 860
                              ? 4
                              : constraints.maxWidth > 520
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
                      const SizedBox(height: 28),
                      // Ocupación por semanas -----------------------------------
                      _TarjetaOcupacion(planes: c.planes, hoy0: hoy0),
                      const SizedBox(height: 28),
                      // Próximas salidas ----------------------------------------
                      Row(
                        children: [
                          Expanded(child: _tituloSeccion(context, 'PRÓXIMAS SALIDAS')),
                          TextButton(
                            onPressed: () => context.go('/planes'),
                            child: const Text('Ver planes'),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      if (proximos.isEmpty)
                        _caja(context,
                            'No tienes fechas futuras con cupos. Agrega fechas en la sección Planes.')
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
                                        width: 50,
                                        height: 50,
                                        alignment: Alignment.center,
                                        decoration: BoxDecoration(
                                          color: cs.primaryContainer,
                                          borderRadius: BorderRadius.circular(15),
                                        ),
                                        child: Column(
                                          mainAxisAlignment: MainAxisAlignment.center,
                                          children: [
                                            Text(
                                              '${s.fecha.day}',
                                              style: TextStyle(
                                                fontWeight: FontWeight.w800,
                                                fontSize: 17,
                                                height: 1,
                                                color: cs.onPrimaryContainer,
                                              ),
                                            ),
                                            const SizedBox(height: 2),
                                            Text(
                                              _mesCorto(s.fecha.month),
                                              style: TextStyle(
                                                fontWeight: FontWeight.w700,
                                                fontSize: 9.5,
                                                letterSpacing: .8,
                                                color:
                                                    cs.onPrimaryContainer.withValues(alpha: .8),
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                      const SizedBox(width: 14),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              s.titulo,
                                              maxLines: 1,
                                              overflow: TextOverflow.ellipsis,
                                              style: const TextStyle(
                                                  fontWeight: FontWeight.w700, fontSize: 14),
                                            ),
                                            const SizedBox(height: 2),
                                            Text(
                                              formatFechaLarga(s.fecha),
                                              style: TextStyle(
                                                  fontSize: 12.5, color: cs.onSurfaceVariant),
                                            ),
                                          ],
                                        ),
                                      ),
                                      const SizedBox(width: 10),
                                      _PillCupos(cupos: s.cupos, total: s.total),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                      const SizedBox(height: 24),
                      // Últimas ventas ------------------------------------------
                      _tituloSeccion(context, 'ÚLTIMAS VENTAS'),
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
                                      InitialsAvatar(
                                          v.codigo.replaceFirst('DIV-', ''), radius: 15),
                                      const SizedBox(width: 13),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              '${v.codigo} · ${v.planTitulo}',
                                              maxLines: 1,
                                              overflow: TextOverflow.ellipsis,
                                              style: const TextStyle(
                                                  fontWeight: FontWeight.w700, fontSize: 13.5),
                                            ),
                                            const SizedBox(height: 2),
                                            Text(
                                              '${formatFechaCorta(v.fecha)} · ${v.pax} pax · saldo ${formatCOP(v.saldoAgencia)}',
                                              style: TextStyle(
                                                  fontSize: 12, color: cs.onSurfaceVariant),
                                            ),
                                          ],
                                        ),
                                      ),
                                      Text(
                                        formatCOP(v.montoTotal),
                                        style: const TextStyle(
                                            fontWeight: FontWeight.w800, fontSize: 14.5),
                                      ),
                                    ],
                                  ),
                                ),
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

  static DateTime _hoy0() {
    final h = DateTime.now();
    return DateTime(h.year, h.month, h.day);
  }

  static List<({DateTime fecha, String titulo, int cupos, int total})> _proximasSalidas(
      List<Plan> planes, DateTime hoy0) {
    final out = <({DateTime fecha, String titulo, int cupos, int total})>[];
    for (final p in planes) {
      for (final d in p.dates) {
        final f0 = DateTime(d.fecha.year, d.fecha.month, d.fecha.day);
        if (f0.isAfter(hoy0) && d.cupoDisponible > 0) {
          out.add((
            fecha: d.fecha,
            titulo: p.titulo,
            cupos: d.cupoDisponible,
            total: d.cupoTotal,
          ));
        }
      }
    }
    out.sort((x, y) => x.fecha.compareTo(y.fecha));
    return out;
  }

  Widget _tituloSeccion(BuildContext context, String texto) {
    final cs = Theme.of(context).colorScheme;
    return Text(
      texto,
      style: TextStyle(
        fontSize: 11.5,
        fontWeight: FontWeight.w700,
        letterSpacing: 1.2,
        color: cs.onSurfaceVariant,
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

  String _mesCorto(int m) =>
      const ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'][
          m - 1];

  String _labelEstado(VerificationStatus e) => switch (e) {
        VerificationStatus.pendiente => 'En verificación',
        VerificationStatus.verificado => 'Agencia verificada ✓',
        VerificationStatus.rechazado => 'Verificación rechazada',
      };
}

/// Píldora de cupos libres con semántica de urgencia.
class _PillCupos extends StatelessWidget {
  const _PillCupos({required this.cupos, required this.total});

  final int cupos;
  final int total;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final urgente = cupos <= 3;
    final lleno = total > 0 && cupos / total <= .34;
    final color = urgente || lleno ? Colors.orange.shade800 : cs.primary;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: .13),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        '$cupos cupos',
        style: TextStyle(color: color, fontSize: 11.5, fontWeight: FontWeight.w800),
      ),
    );
  }
}

/// Tarjeta con el gráfico de ocupación semanal (pista + parte vendida) de
/// las próximas 8 semanas, derivado de las fechas de los planes.
class _TarjetaOcupacion extends StatelessWidget {
  const _TarjetaOcupacion({required this.planes, required this.hoy0});

  final List<Plan> planes;
  final DateTime hoy0;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final semanas = <({DateTime inicio, int vendidos, int total})>[];
    for (var i = 0; i < 8; i++) {
      final ini = hoy0.add(Duration(days: 7 * i));
      final fin = hoy0.add(Duration(days: 7 * (i + 1)));
      var vendidos = 0;
      var total = 0;
      for (final p in planes) {
        for (final d in p.dates) {
          final f0 = DateTime(d.fecha.year, d.fecha.month, d.fecha.day);
          if (!f0.isBefore(ini) && f0.isBefore(fin)) {
            vendidos += d.cupoTotal - d.cupoDisponible;
            total += d.cupoTotal;
          }
        }
      }
      semanas.add((inicio: ini, vendidos: vendidos, total: total));
    }

    final conCupo = semanas.where((s) => s.total > 0).toList();
    final ocupProm = conCupo.isEmpty
        ? 0.0
        : conCupo.fold<double>(0, (s, x) => s + x.vendidos / x.total) / conCupo.length;

    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: cs.surfaceContainerLow,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: cs.outlineVariant.withValues(alpha: .4)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'OCUPACIÓN · PRÓXIMAS 8 SEMANAS',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 1.2,
                        color: cs.onSurfaceVariant,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '${(ocupProm * 100).toStringAsFixed(0)}%',
                      style: TextStyle(
                        fontSize: 30,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -1,
                        height: 1,
                        color: cs.onSurface,
                      ),
                    ),
                  ],
                ),
              ),
              Text(
                'cupos vendidos / ofertados',
                style: TextStyle(fontSize: 12, color: cs.onSurfaceVariant),
              ),
            ],
          ),
          const SizedBox(height: 20),
          SizedBox(
            height: 96,
            child: CustomPaint(
              size: Size.infinite,
              painter: _BarrasOcupacion(
                semanas: semanas,
                colorTinta: cs.primary,
                colorPista: cs.surfaceContainerHighest,
              ),
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              for (final s in semanas)
                Expanded(
                  child: Text(
                    '${s.inicio.day}/${s.inicio.month}',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 10, color: cs.onSurfaceVariant),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class _BarrasOcupacion extends CustomPainter {
  const _BarrasOcupacion({
    required this.semanas,
    required this.colorTinta,
    required this.colorPista,
  });

  final List<({DateTime inicio, int vendidos, int total})> semanas;
  final Color colorTinta;
  final Color colorPista;

  @override
  void paint(Canvas canvas, Size size) {
    if (semanas.isEmpty) return;
    final n = semanas.length;
    const gap = 7.0;
    final ancho = (size.width - gap * (n - 1)) / n;
    const r = Radius.circular(5);

    for (var i = 0; i < n; i++) {
      final s = semanas[i];
      final x = i * (ancho + gap);
      final pista = RRect.fromRectAndCorners(
        Rect.fromLTWH(x, 0, ancho, size.height),
        topLeft: r,
        topRight: r,
        bottomLeft: r,
        bottomRight: r,
      );
      canvas.drawRRect(pista, Paint()..color = colorPista);

      final ocup = s.total == 0 ? 0.0 : (s.vendidos / s.total).clamp(0.0, 1.0);
      if (ocup > 0) {
        final h = size.height * ocup;
        canvas.save();
        canvas.clipRect(Rect.fromLTWH(x - 1, size.height - h, ancho + 2, h + 1));
        canvas.drawRRect(pista, Paint()..color = colorTinta);
        canvas.restore();
      }
    }
  }

  @override
  bool shouldRepaint(covariant _BarrasOcupacion old) =>
      old.semanas != semanas || old.colorTinta != colorTinta;
}
