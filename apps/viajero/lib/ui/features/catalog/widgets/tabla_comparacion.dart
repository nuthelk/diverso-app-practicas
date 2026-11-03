import 'dart:math' as math;

import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../router/app_routes.dart';
import '../../../core/theme/app_text.dart';
import 'cabecera_plan.dart';
import 'valor_comparado.dart';

/// Tabla de comparación: una columna por plan con ancho mínimo legible. Si no caben todas, la tabla
/// se desliza de lado en vez de aplastar las columnas. La columna del plan más barato va resaltada.
class TablaComparacion extends StatelessWidget {
  const TablaComparacion({super.key, required this.planes, required this.filas});

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
                    celda(i, CabeceraPlan(plan: planes[i], mejorPrecio: esBarato(i)), arriba: true),
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
                            fontSize: AppText.leyenda,
                            fontWeight: FontWeight.w600,
                            color: cs.onSurfaceVariant,
                            height: 1.3,
                          ),
                        ),
                      ),
                      for (var i = 0; i < fila.valores.length; i++)
                        celda(
                          i,
                          ValorComparado(
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
                      onPressed: () => context.push(AppRoutes.plan(planes[i].id)),
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
                    style: TextStyle(fontSize: AppText.leyenda, color: cs.onSurfaceVariant),
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
