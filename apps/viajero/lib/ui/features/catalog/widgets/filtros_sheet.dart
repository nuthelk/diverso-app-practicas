import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';

import '../../../core/theme/app_radii.dart';
import '../../../core/theme/app_text.dart';
import '../../../core/widgets/section_label.dart';
import '../view_models/catalog_view_model.dart';

/// Límites del deslizador de precio máximo por persona (COP). En [_precioMaximo] el filtro queda
/// sin límite.
const double _precioMinimo = 50000;
const double _precioMaximo = 600000;
const int _divisionesPrecio = 11;

/// Hoja de filtros: fecha, precio máximo y destino (Anexo 6: filtros por
/// destino, fecha, precio y categoría — los cuatro del catálogo). «Aplicar» los envía juntos al
/// [CatalogViewModel] con una sola consulta.
class FiltrosSheet extends StatefulWidget {
  const FiltrosSheet({super.key, required this.viewModel});

  final CatalogViewModel viewModel;

  @override
  State<FiltrosSheet> createState() => _FiltrosSheetState();
}

class _FiltrosSheetState extends State<FiltrosSheet> {
  late double? _precio = widget.viewModel.precioMax;
  late DateTime? _fecha = widget.viewModel.fecha;

  /// Destino elegido en la hoja; vacío = todos. Parte del destino activo para que cambiar solo el
  /// precio o la fecha no lo borre.
  late String _destino = widget.viewModel.destino ?? '';
  final _busquedaDestino = TextEditingController();

  @override
  void dispose() {
    _busquedaDestino.dispose();
    super.dispose();
  }

  Future<void> _elegirFecha() async {
    final ahora = DateTime.now();
    final f = await showDatePicker(
      context: context,
      initialDate: _fecha ?? ahora.add(const Duration(days: 1)),
      firstDate: ahora,
      lastDate: ahora.add(const Duration(days: 365)),
    );
    if (f != null) setState(() => _fecha = f);
  }

  void _limpiar() {
    setState(() {
      _fecha = null;
      _precio = null;
      _destino = '';
      _busquedaDestino.clear();
    });
  }

  Future<void> _aplicar() async {
    Navigator.pop(context);
    await widget.viewModel.aplicarFiltros(
      destino: _destino.isEmpty ? null : _destino,
      precioMax: _precio,
      fecha: _fecha,
    );
  }

  @override
  Widget build(BuildContext context) {
    final vm = widget.viewModel;
    final cs = Theme.of(context).colorScheme;
    final precio = _precio;
    final opciones = [
      'Todos los destinos',
      ...vm.destinos.where(
        (d) => d.toLowerCase().contains(_busquedaDestino.text.trim().toLowerCase()),
      ),
    ];

    return Padding(
      padding: EdgeInsets.fromLTRB(24, 0, 24, 24 + MediaQuery.viewInsetsOf(context).bottom),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Filtros',
            style: TextStyle(
              fontSize: AppText.encabezadoL,
              fontWeight: FontWeight.w800,
              letterSpacing: -.5,
            ),
          ),
          const SizedBox(height: 22),
          const SectionLabel('Fecha del plan'),
          Row(
            children: [
              Expanded(
                child: _OpcionFecha(
                  icono: Icons.calendar_month_rounded,
                  texto: _fecha == null ? 'Cualquier fecha' : formatFechaCorta(_fecha!),
                  onTap: _elegirFecha,
                ),
              ),
              if (_fecha != null) ...[
                const SizedBox(width: 8),
                IconButton.outlined(
                  tooltip: 'Quitar fecha',
                  onPressed: () => setState(() => _fecha = null),
                  icon: const Icon(Icons.close_rounded, size: 18),
                ),
              ],
            ],
          ),
          const SizedBox(height: 20),
          const SectionLabel('Precio máximo por persona'),
          Row(
            children: [
              Expanded(
                child: Slider(
                  value: (precio ?? _precioMaximo).clamp(_precioMinimo, _precioMaximo),
                  min: _precioMinimo,
                  max: _precioMaximo,
                  divisions: _divisionesPrecio,
                  label: formatCOP(precio ?? _precioMaximo),
                  onChanged: (v) => setState(() => _precio = v >= _precioMaximo ? null : v),
                ),
              ),
              SizedBox(
                width: 110,
                child: Text(
                  precio == null || precio == 0 ? 'Sin límite' : formatCOP(precio),
                  textAlign: TextAlign.right,
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: AppText.cuerpoChico,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          // Selector de destino: buscador + lista propia con scroll (el menú
          // de DropdownButton dentro de la hoja no recibía los gestos).
          const SectionLabel('Destino'),
          TextField(
            controller: _busquedaDestino,
            onChanged: (_) => setState(() {}),
            textInputAction: TextInputAction.search,
            decoration: const InputDecoration(
              hintText: 'Buscar destino…',
              prefixIcon: Icon(Icons.search_rounded),
              isDense: true,
            ),
          ),
          const SizedBox(height: 8),
          ConstrainedBox(
            constraints: const BoxConstraints(maxHeight: 192),
            child: ListView.builder(
              shrinkWrap: true,
              itemCount: opciones.length,
              itemBuilder: (context, i) {
                final d = opciones[i];
                final esTodos = i == 0;
                final sel = _destino == (esTodos ? '' : d);
                return ListTile(
                  dense: true,
                  visualDensity: VisualDensity.compact,
                  leading: Icon(
                    esTodos
                        ? Icons.travel_explore_outlined
                        : sel
                        ? Icons.check_circle_rounded
                        : Icons.location_on_outlined,
                    size: 19,
                    color: sel ? cs.primary : cs.onSurfaceVariant,
                  ),
                  title: Text(
                    d,
                    style: TextStyle(
                      fontSize: AppText.cuerpo,
                      fontWeight: sel ? FontWeight.w700 : FontWeight.w500,
                      color: sel ? cs.primary : cs.onSurface,
                    ),
                  ),
                  onTap: () => setState(() => _destino = esTodos ? '' : d),
                );
              },
            ),
          ),
          const SizedBox(height: 24),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(onPressed: _limpiar, child: const Text('Limpiar')),
              ),
              const SizedBox(width: 12),
              Expanded(
                flex: 2,
                child: FilledButton.icon(
                  style: FilledButton.styleFrom(
                    backgroundColor: cs.primary,
                    foregroundColor: cs.onPrimary,
                  ),
                  onPressed: _aplicar,
                  icon: const Icon(Icons.check_rounded),
                  label: const Text('Aplicar filtros'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _OpcionFecha extends StatelessWidget {
  const _OpcionFecha({required this.icono, required this.texto, required this.onTap});

  final IconData icono;
  final String texto;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return InkWell(
      borderRadius: BorderRadius.circular(AppRadios.field),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
        decoration: BoxDecoration(
          color: cs.surfaceContainerHigh,
          borderRadius: BorderRadius.circular(AppRadios.field),
        ),
        child: Row(
          children: [
            Icon(icono, size: 19, color: cs.primary),
            const SizedBox(width: 10),
            Text(
              texto,
              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: AppText.cuerpo),
            ),
          ],
        ),
      ),
    );
  }
}
