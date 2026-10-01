import 'package:flutter/material.dart';
import 'package:diverso_core/diverso_core.dart';

import '../../core/widgets.dart';

/// Diálogo de fechas y cupos de un plan (calendario de inventario).
class FechasDialog extends StatefulWidget {
  const FechasDialog({
    super.key,
    required this.planId,
    required this.agencyId,
    required this.initialFechas,
  });

  final String planId;
  final String agencyId;
  final List<PlanDate> initialFechas;

  @override
  State<FechasDialog> createState() => _FechasDialogState();
}

class _FechasDialogState extends State<FechasDialog> {
  final _servicio = AgencyService();
  late List<PlanDate> _fechas;
  DateTime _fechaSel = DateTime.now().add(const Duration(days: 1));
  final _cupoCtrl = TextEditingController(text: '15');
  bool _agregando = false;

  @override
  void initState() {
    super.initState();
    final ahora = DateTime.now();
    final hoy = DateTime(ahora.year, ahora.month, ahora.day);
    _fechas = widget.initialFechas
        .where((d) => !d.fecha.isBefore(hoy))
        .toList()
      ..sort((a, b) => a.fecha.compareTo(b.fecha));
  }

  @override
  void dispose() {
    _cupoCtrl.dispose();
    super.dispose();
  }

  Future<void> _agregar() async {
    final cupo = int.tryParse(_cupoCtrl.text) ?? 0;
    if (cupo <= 0 || _agregando) return;
    setState(() => _agregando = true);
    final msg = ScaffoldMessenger.of(context);
    try {
      await _servicio.agregarFecha(planId: widget.planId, fecha: _fechaSel, cupoTotal: cupo);
      final planes = await _servicio.misPlanes(widget.agencyId);
      final actualizado = planes.firstWhere((p) => p.id == widget.planId);
      setState(() {
        _fechas = _ordenar(actualizado.dates);
        _agregando = false;
      });
      msg.showSnackBar(
          SnackBar(content: Text('Fecha ${formatFechaCorta(_fechaSel)} agregada.')));
    } on DiversoException catch (e) {
      msg.showSnackBar(SnackBar(content: Text(e.mensajeUsuario)));
      setState(() => _agregando = false);
    }
  }

  List<PlanDate> _ordenar(List<PlanDate> ds) {
    final ahora = DateTime.now();
    final hoy = DateTime(ahora.year, ahora.month, ahora.day);
    return ds.where((d) => !d.fecha.isBefore(hoy)).toList()
      ..sort((a, b) => a.fecha.compareTo(b.fecha));
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;

    return Dialog(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 560, maxHeight: 640),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'Fechas y cupos',
                style: TextStyle(fontSize: 21, fontWeight: FontWeight.w800, letterSpacing: -.5, color: cs.onSurface),
              ),
              const SizedBox(height: 4),
              Text(
                'Cada fecha controla su propio inventario en tiempo real.',
                style: TextStyle(fontSize: 13, color: cs.onSurfaceVariant),
              ),
              const SizedBox(height: 18),
              Row(
                children: [
                  Expanded(
                    child: InputDatePickerFormField(
                      firstDate: DateTime.now(),
                      lastDate: DateTime.now().add(const Duration(days: 365)),
                      initialDate: _fechaSel,
                      onDateSubmitted: (d) => setState(() => _fechaSel = d),
                    ),
                  ),
                  const SizedBox(width: 10),
                  SizedBox(
                    width: 90,
                    child: TextFormField(
                      controller: _cupoCtrl,
                      decoration: const InputDecoration(labelText: 'Cupo'),
                      keyboardType: TextInputType.number,
                    ),
                  ),
                  const SizedBox(width: 10),
                  FilledButton.tonal(
                    onPressed: _agregando ? null : _agregar,
                    child: _agregando
                        ? const SizedBox(
                            width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                        : const Text('Agregar'),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              Expanded(
                child: _fechas.isEmpty
                    ? EmptyState(
                        icono: Icons.event_busy_rounded,
                        titulo: 'Sin fechas futuras',
                        mensaje: 'Agrega la primera fecha para empezar a vender.',
                      )
                    : ListView.builder(
                        itemCount: _fechas.length,
                        itemBuilder: (context, i) {
                          final d = _fechas[i];
                          final agotada = d.cupoDisponible == 0;
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                              decoration: BoxDecoration(
                                color: cs.surfaceContainerLow,
                                borderRadius: BorderRadius.circular(14),
                              ),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                      formatFechaLarga(d.fecha),
                                      style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13.5),
                                    ),
                                  ),
                                  Text(
                                    'Cupo ${d.cupoDisponible}/${d.cupoTotal}',
                                    style: TextStyle(
                                      fontSize: 12.5,
                                      color: agotada ? Colors.orange.shade800 : cs.onSurfaceVariant,
                                      fontWeight: agotada ? FontWeight.w700 : FontWeight.w500,
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  if (agotada)
                                    StatusPill('Agotado', color: Colors.orange.shade800),
                                  if (d.cupoDisponible == d.cupoTotal)
                                    IconButton(
                                      icon: const Icon(Icons.delete_outline_rounded, size: 19),
                                      tooltip: 'Eliminar fecha',
                                      onPressed: () async {
                                        await _servicio.eliminarFecha(d.id);
                                        setState(() => _fechas.removeAt(i));
                                      },
                                    )
                                  else
                                    const Tooltip(
                                      message: 'Solo se elimina si no hay reservas',
                                      child: Icon(Icons.lock_outline_rounded, size: 15, color: Colors.black26),
                                    ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
              ),
              Align(
                alignment: Alignment.centerRight,
                child: FilledButton(
                  style: FilledButton.styleFrom(minimumSize: const Size(90, 44)),
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Listo'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
