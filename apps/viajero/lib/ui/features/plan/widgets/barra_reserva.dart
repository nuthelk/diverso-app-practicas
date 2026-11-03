import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../router/app_routes.dart';
import '../../../core/theme/app_radii.dart';
import '../../../core/theme/app_text.dart';
import '../../../core/theme/diverso_colors.dart';

/// Pocos cupos: desde aquí hacia abajo se avisa «¡Últimos N!».
const int _pocosCupos = 4;

/// Barra inferior de la ficha: fechas con sus cupos, precio y el botón «Reservar» de la fecha
/// elegida. No guarda estado: la fecha elegida la maneja quien la construye ([seleccionada] y
/// [onSeleccionar]).
class BarraReserva extends StatelessWidget {
  const BarraReserva({
    super.key,
    required this.plan,
    required this.fechas,
    required this.seleccionada,
    required this.onSeleccionar,
  });

  final Plan plan;

  /// Fechas reservables, de la más cercana a la más lejana.
  final List<PlanDate> fechas;

  /// La fecha elegida; null solo cuando [fechas] está vacía.
  final PlanDate? seleccionada;
  final ValueChanged<PlanDate> onSeleccionar;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final fecha = seleccionada;

    if (fecha == null) {
      return _Superficie(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Row(
            children: [
              Icon(Icons.event_busy_rounded, color: cs.onSurfaceVariant),
              const SizedBox(width: 10),
              const Expanded(
                child: Text(
                  'Sin fechas disponibles por ahora',
                  style: TextStyle(fontWeight: FontWeight.w600),
                ),
              ),
              // Flexible: en celulares angostos o con letra grande el botón parte su texto en vez de desbordar.
              Flexible(
                child: TextButton(
                  onPressed: () => context.pop(),
                  child: const Text('Ver otros planes', textAlign: TextAlign.center),
                ),
              ),
            ],
          ),
        ),
      );
    }

    return _Superficie(
      child: SafeArea(
        minimum: const EdgeInsets.fromLTRB(20, 10, 20, 12),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              height: 62,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: fechas.length,
                separatorBuilder: (_, _) => const SizedBox(width: 8),
                itemBuilder: (context, i) {
                  final f = fechas[i];
                  final sel = f.id == fecha.id;
                  final pocos = f.cupoDisponible <= _pocosCupos;
                  return AnimatedContainer(
                    duration: const Duration(milliseconds: 160),
                    curve: Curves.easeOut,
                    padding: const EdgeInsets.symmetric(horizontal: 14),
                    decoration: BoxDecoration(
                      color: sel ? cs.primary : cs.surfaceContainerHigh,
                      borderRadius: BorderRadius.circular(AppRadios.field),
                    ),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(AppRadios.field),
                      onTap: () => onSeleccionar(f),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            formatFechaCorta(f.fecha),
                            style: TextStyle(
                              fontSize: AppText.detalle,
                              fontWeight: FontWeight.w700,
                              color: sel ? cs.onPrimary : cs.onSurface,
                            ),
                          ),
                          Text(
                            pocos ? '¡Últimos ${f.cupoDisponible}!' : '${f.cupoDisponible} cupos',
                            style: TextStyle(
                              fontSize: AppText.nota,
                              fontWeight: FontWeight.w600,
                              color: sel
                                  ? cs.onPrimary.withValues(alpha: .8)
                                  : pocos
                                  ? DiversoColors.of(context).pocosCupos
                                  : cs.onSurfaceVariant,
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      formatCOP(plan.precioCop),
                      style: TextStyle(
                        fontSize: AppText.encabezadoL,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -.5,
                        color: cs.onSurface,
                      ),
                    ),
                    Text(
                      'por persona · precio final',
                      style: TextStyle(fontSize: AppText.micro, color: cs.onSurfaceVariant),
                    ),
                  ],
                ),
                const Spacer(),
                FilledButton.icon(
                  style: FilledButton.styleFrom(minimumSize: const Size(150, 52)),
                  onPressed: () => context.push(AppRoutes.checkout(plan.id, fecha.id)),
                  icon: const Icon(Icons.lock_outline_rounded, size: 17),
                  label: const Text('Reservar'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _Superficie extends StatelessWidget {
  const _Superficie({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).scaffoldBackgroundColor,
        border: Border(top: BorderSide(color: cs.outlineVariant.withValues(alpha: .5))),
      ),
      child: child,
    );
  }
}
