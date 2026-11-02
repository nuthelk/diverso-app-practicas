import 'dart:math' as math;

import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/widgets/feedback/empty_state.dart';

/// Comparador de planes "todo incluido" (Anexo 6, idea 7): enfrenta hasta 3
/// planes con precio final y qué incluye cada uno, sin sorpresas.
class ComparatorView extends StatefulWidget {
  const ComparatorView({super.key, required this.planes});

  final List<Plan> planes;

  @override
  State<ComparatorView> createState() => _ComparatorViewState();
}

class _ComparatorViewState extends State<ComparatorView> {
  static const _minViajeros = 1;
  static const _maxViajeros = 20;

  int _pax = 2;

  List<Plan> get planes => widget.planes;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final filas = buildComparisonRows(planes, pax: _pax);

    return Scaffold(
      appBar: AppBar(title: const Text('Comparar planes')),
      body: planes.length < 2
          ? const EmptyState(
              icono: Icons.compare_arrows_rounded,
              titulo: 'Nada para comparar',
              mensaje: 'Selecciona dos o tres planes en el catálogo con el ícono de comparar.',
            )
          : ListView(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
              children: [
                Text(
                  'Elige con toda la información',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w800,
                    letterSpacing: -.8,
                    color: cs.onSurface,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Precio final por persona, sin cargos ocultos.',
                  style: TextStyle(color: cs.onSurfaceVariant, fontSize: 13.5),
                ),
                const SizedBox(height: 16),
                _SelectorViajeros(
                  pax: _pax,
                  onChanged: (v) => setState(() => _pax = v),
                  min: _minViajeros,
                  max: _maxViajeros,
                ),
                const SizedBox(height: 20),
                _TablaComparacion(planes: planes, filas: filas),
              ],
            ),
    );
  }
}

/// Tabla de comparación: una columna por plan con ancho mínimo legible. Si no caben todas, la tabla
/// se desliza de lado en vez de aplastar las columnas. La columna del plan más barato va resaltada.
class _TablaComparacion extends StatelessWidget {
  const _TablaComparacion({required this.planes, required this.filas});

  final List<Plan> planes;
  final List<ComparisonRow> filas;

  static const _anchoEtiqueta = 92.0;
  static const _anchoMinColumna = 132.0;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final barato = planes.map((p) => p.precioCop).reduce(math.min);
    bool esBarato(int i) => planes[i].precioCop == barato;

    return LayoutBuilder(
      builder: (context, restricciones) {
        final anchoColumna = math.max(
          _anchoMinColumna,
          (restricciones.maxWidth - _anchoEtiqueta) / planes.length,
        );
        final anchoTabla = _anchoEtiqueta + anchoColumna * planes.length;
        final desliza = anchoTabla > restricciones.maxWidth + .5;

        // Celda de la columna [i]; la del más barato lleva un fondo tenue de punta a punta.
        Widget celda(int i, Widget hijo, {bool arriba = false, bool abajo = false}) => Container(
          width: anchoColumna,
          padding: EdgeInsets.fromLTRB(8, arriba ? 8 : 12, 8, abajo ? 10 : 12),
          decoration: BoxDecoration(
            color: esBarato(i) ? cs.primary.withValues(alpha: .07) : null,
            borderRadius: BorderRadius.vertical(
              top: Radius.circular(arriba ? 16 : 0),
              bottom: Radius.circular(abajo ? 16 : 0),
            ),
          ),
          child: hijo,
        );

        final tabla = Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Cabecera: foto, título y sello de mejor precio.
            IntrinsicHeight(
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const SizedBox(width: _anchoEtiqueta),
                  for (var i = 0; i < planes.length; i++)
                    celda(
                      i,
                      _CabeceraPlan(plan: planes[i], mejorPrecio: esBarato(i)),
                      arriba: true,
                    ),
                ],
              ),
            ),
            // Filas comparables.
            for (final fila in filas)
              DecoratedBox(
                decoration: BoxDecoration(
                  border: Border(top: BorderSide(color: cs.outlineVariant.withValues(alpha: .5))),
                ),
                child: IntrinsicHeight(
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Container(
                        width: _anchoEtiqueta,
                        padding: const EdgeInsets.fromLTRB(0, 12, 8, 12),
                        child: Text(
                          fila.titulo,
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: cs.onSurfaceVariant,
                            height: 1.3,
                          ),
                        ),
                      ),
                      for (var i = 0; i < fila.valores.length; i++)
                        celda(
                          i,
                          _ValorComparado(
                            valor: fila.valores[i],
                            esPrecio: fila.icono == 'precio' || fila.icono == 'total',
                            destacado:
                                (fila.icono == 'precio' || fila.icono == 'total') && esBarato(i),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            // Un botón por plan, alineado con su columna.
            Row(
              children: [
                const SizedBox(width: _anchoEtiqueta),
                for (var i = 0; i < planes.length; i++)
                  celda(
                    i,
                    FilledButton.tonal(
                      style: FilledButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 8),
                        minimumSize: const Size.fromHeight(40),
                      ),
                      onPressed: () => context.push('/plan/${planes[i].id}'),
                      child: const Text('Ver plan'),
                    ),
                    abajo: true,
                  ),
              ],
            ),
          ],
        );

        if (!desliza) return tabla;
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.swipe_left_rounded, size: 16, color: cs.onSurfaceVariant),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    'Desliza la tabla para ver todos los planes',
                    style: TextStyle(fontSize: 12, color: cs.onSurfaceVariant),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: SizedBox(width: anchoTabla, child: tabla),
            ),
          ],
        );
      },
    );
  }
}

class _CabeceraPlan extends StatelessWidget {
  const _CabeceraPlan({required this.plan, required this.mejorPrecio});

  final Plan plan;
  final bool mejorPrecio;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        AspectRatio(
          aspectRatio: 1.5,
          child: Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              color: cs.primaryContainer,
              image: plan.fotoPrincipal == null
                  ? null
                  : DecorationImage(image: NetworkImage(plan.fotoPrincipal!), fit: BoxFit.cover),
            ),
            child: plan.fotoPrincipal == null
                ? Center(child: Text(plan.categoria.emoji, style: const TextStyle(fontSize: 26)))
                : null,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          plan.titulo,
          maxLines: 3,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5, height: 1.25),
        ),
        if (mejorPrecio) ...[
          const SizedBox(height: 6),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              color: cs.primaryContainer,
              borderRadius: BorderRadius.circular(999),
            ),
            child: Text(
              'Mejor precio',
              style: TextStyle(
                fontSize: 10.5,
                fontWeight: FontWeight.w700,
                color: cs.onPrimaryContainer,
              ),
            ),
          ),
        ],
      ],
    );
  }
}

/// Control "¿Cuántos viajan?" (− / +) que recalcula el total de la tabla.
class _SelectorViajeros extends StatelessWidget {
  const _SelectorViajeros({
    required this.pax,
    required this.onChanged,
    required this.min,
    required this.max,
  });

  final int pax;
  final ValueChanged<int> onChanged;
  final int min;
  final int max;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Row(
      children: [
        Expanded(
          child: Text(
            '¿Cuántos viajan?',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: cs.onSurface),
          ),
        ),
        IconButton.outlined(
          tooltip: 'Menos viajeros',
          onPressed: pax > min ? () => onChanged(pax - 1) : null,
          icon: const Icon(Icons.remove_rounded),
        ),
        SizedBox(
          width: 40,
          child: Text(
            '$pax',
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800),
          ),
        ),
        IconButton.outlined(
          tooltip: 'Más viajeros',
          onPressed: pax < max ? () => onChanged(pax + 1) : null,
          icon: const Icon(Icons.add_rounded),
        ),
      ],
    );
  }
}

class _ValorComparado extends StatelessWidget {
  const _ValorComparado({required this.valor, required this.esPrecio, required this.destacado});

  final String valor;
  final bool esPrecio;
  final bool destacado;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;

    if (esPrecio) {
      final numero = double.tryParse(valor);
      // Una sola línea: el «$» nunca queda separado del monto; si no cabe, se achica.
      return FittedBox(
        fit: BoxFit.scaleDown,
        alignment: Alignment.topLeft,
        child: Text(
          numero == null ? valor : formatCOP(numero),
          maxLines: 1,
          softWrap: false,
          style: TextStyle(
            fontSize: destacado ? 16 : 14.5,
            fontWeight: destacado ? FontWeight.w800 : FontWeight.w600,
            color: destacado ? cs.primary : cs.onSurface,
          ),
        ),
      );
    }
    final incluido = valor == '✓ Incluido';
    final vacio = valor == '—';
    return Text(
      valor,
      style: TextStyle(
        fontSize: 13,
        height: 1.4,
        fontWeight: incluido ? FontWeight.w700 : FontWeight.w500,
        color: incluido
            ? cs.primary
            : vacio
            ? cs.outline
            : cs.onSurface,
      ),
    );
  }
}
