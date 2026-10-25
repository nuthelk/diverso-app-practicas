import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:diverso_core/diverso_core.dart';

import '../../../ui/core/widgets.dart';

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
    final barato = planes.map((p) => p.precioCop).reduce((a, b) => a < b ? a : b);

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
                // Cabecera con las fotos/títulos
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(width: 92),
                    for (final p in planes)
                      Expanded(
                        child: Padding(
                          padding: const EdgeInsets.only(left: 10),
                          child: Column(
                            children: [
                              AspectRatio(
                                aspectRatio: 1.5,
                                child: Container(
                                  decoration: BoxDecoration(
                                    borderRadius: BorderRadius.circular(14),
                                    color: cs.primaryContainer,
                                    image: p.fotoPrincipal == null
                                        ? null
                                        : DecorationImage(
                                            image: NetworkImage(p.fotoPrincipal!),
                                            fit: BoxFit.cover,
                                          ),
                                  ),
                                  child: p.fotoPrincipal == null
                                      ? Center(child: Text(p.categoria.emoji, style: const TextStyle(fontSize: 26)))
                                      : null,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                p.titulo,
                                maxLines: 3,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                    fontWeight: FontWeight.w700, fontSize: 13.5, height: 1.25),
                              ),
                              if (p.precioCop == barato) ...[
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
                          ),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 24),
                // Filas comparables
                for (final fila in filas)
                  Container(
                    decoration: BoxDecoration(
                      border: Border(
                        top: BorderSide(color: cs.outlineVariant.withValues(alpha: .5)),
                      ),
                    ),
                    padding: const EdgeInsets.symmetric(vertical: 13),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        SizedBox(
                          width: 92,
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
                        for (final valor in fila.valores)
                          Expanded(
                            child: Padding(
                              padding: const EdgeInsets.only(left: 10),
                              child: _ValorComparado(
                                valor: valor,
                                esPrecio: fila.icono == 'precio' || fila.icono == 'total',
                                destacado: (fila.icono == 'precio' || fila.icono == 'total') &&
                                    valor.replaceAll(RegExp(r'[^0-9]'), '') ==
                                        barato.toStringAsFixed(0),
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                const SizedBox(height: 24),
                // CTAs por plan
                for (final p in planes)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(
                        foregroundColor: cs.onSurface,
                      ),
                      onPressed: () => context.push('/plan/${p.id}'),
                      icon: const Icon(Icons.arrow_forward_rounded, size: 18),
                      label: Text('Ver "${_cortar(p.titulo, 32)}"'),
                    ),
                  ),
              ],
            ),
    );
  }

  String _cortar(String s, int n) => s.length <= n ? s : '${s.substring(0, n)}…';
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
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: cs.onSurface,
            ),
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
      return Text(
        numero == null ? valor : formatCOP(numero),
        style: TextStyle(
          fontSize: destacado ? 16 : 14.5,
          fontWeight: destacado ? FontWeight.w800 : FontWeight.w600,
          color: destacado ? cs.primary : cs.onSurface,
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
