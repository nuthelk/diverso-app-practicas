import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:diverso_core/diverso_core.dart';
import 'package:provider/provider.dart';

import '../../core/app_theme.dart';

/// Formulario de plan como página (mejor que diálogo en web): secciones en
/// tarjetas, dos columnas en pantallas anchas. Ficha estandarizada del Anexo 4.
class PlanFormView extends StatefulWidget {
  const PlanFormView({super.key, this.planId});

  final String? planId;

  @override
  State<PlanFormView> createState() => _PlanFormViewState();
}

class _PlanFormViewState extends State<PlanFormView> {
  final _formKey = GlobalKey<FormState>();
  late final AgencyRepository _servicio;
  final _titulo = TextEditingController();
  final _destino = TextEditingController();
  final _precio = TextEditingController();
  final _resumen = TextEditingController();
  final _descripcion = TextEditingController();
  final _duracion = TextEditingController();
  final _punto = TextEditingController();
  final _politica = TextEditingController();
  final _incluyeCtrl = TextEditingController();
  final _fotosCtrl = TextEditingController();

  ExperienceCategory _categoria = ExperienceCategory.aventura;
  bool _transporte = true;
  bool _comida = false;
  bool _hospedaje = false;
  List<String> _incluye = [];
  List<String> _fotos = [];
  List<ItinerarioPaso> _itinerario = [];
  String? _planId;
  bool _cargando = true;
  bool _guardando = false;

  @override
  void initState() {
    super.initState();
    _servicio = context.read<AgencyRepository>();
    _planId = widget.planId;
    if (_planId != null) {
      _cargarExistente();
    } else {
      _cargando = false;
    }
  }

  Future<void> _cargarExistente() async {
    try {
      final agencia = await _servicio.miAgencia();
      final planes = await _servicio.misPlanes(agencia!.id);
      final p = planes.firstWhere((x) => x.id == _planId);
      final d = PlanDraft.dePlan(p);
      _titulo.text = d.titulo;
      _destino.text = d.destino;
      _precio.text = d.precioCop > 0 ? d.precioCop.toStringAsFixed(0) : '';
      _resumen.text = d.resumen;
      _descripcion.text = d.descripcion;
      _duracion.text = d.duracionTexto;
      _punto.text = d.puntoEncuentro;
      _politica.text = d.politicaCancelacion;
      _categoria = d.categoria;
      _transporte = d.incluyeTransporte;
      _comida = d.incluyeComida;
      _hospedaje = d.incluyeHospedaje;
      _incluye = List.of(d.incluye);
      _fotos = List.of(d.fotos);
      _itinerario = List.of(d.itinerario);
    } catch (_) {}
    if (mounted) setState(() => _cargando = false);
  }

  @override
  void dispose() {
    _titulo.dispose();
    _destino.dispose();
    _precio.dispose();
    _resumen.dispose();
    _descripcion.dispose();
    _duracion.dispose();
    _punto.dispose();
    _politica.dispose();
    _incluyeCtrl.dispose();
    _fotosCtrl.dispose();
    super.dispose();
  }

  Future<void> _guardar() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _guardando = true);
    final msg = ScaffoldMessenger.of(context);
    try {
      final agencia = await _servicio.miAgencia();
      final draft = PlanDraft(
        id: _planId,
        titulo: _titulo.text.trim(),
        destino: _destino.text.trim(),
        categoria: _categoria,
        precioCop: double.tryParse(_precio.text.trim()) ?? 0,
        resumen: _resumen.text.trim(),
        descripcion: _descripcion.text.trim(),
        duracionTexto: _duracion.text.trim(),
        puntoEncuentro: _punto.text.trim(),
        incluye: _incluye,
        incluyeTransporte: _transporte,
        incluyeComida: _comida,
        incluyeHospedaje: _hospedaje,
        itinerario: _itinerario,
        politicaCancelacion: _politica.text.trim(),
        fotos: _fotos,
      );
      if (_planId == null) {
        await _servicio.crearPlan(agencia!.id, draft);
      } else {
        await _servicio.actualizarPlan(draft);
      }
      msg.showSnackBar(const SnackBar(content: Text('Plan guardado.')));
      if (mounted) context.pop(true);
    } on DiversoException catch (e) {
      msg.showSnackBar(SnackBar(content: Text(e.mensajeUsuario)));
      if (mounted) setState(() => _guardando = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;

    if (_cargando) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(_planId == null ? 'Nuevo plan' : 'Editar plan'),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 20),
            child: FilledButton(
              style: FilledButton.styleFrom(minimumSize: const Size(0, 42)),
              onPressed: _guardando ? null : _guardar,
              child: _guardando
                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Text('Guardar'),
            ),
          ),
        ],
      ),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 780),
          child: Form(
            key: _formKey,
            child: ListView(
              padding: const EdgeInsets.all(24),
              children: [
                _seccion('Lo esencial', [
                  // Grilla proporcional: título a todo el ancho; destino,
                  // categoría, precio y duración reparten la fila en anchos.
                  LayoutBuilder(
                    builder: (context, constraints) {
                      final w = constraints.maxWidth;
                      final campoAncho = w > 620 ? (w - 36) / 4 : (w - 12) / 2;
                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _campo(_titulo, 'Título del plan', requerido: true),
                          const SizedBox(height: 12),
                          Wrap(
                            spacing: 12,
                            runSpacing: 12,
                            children: [
                              SizedBox(width: campoAncho, child: _campo(_destino, 'Destino', requerido: true)),
                              SizedBox(
                                width: campoAncho,
                                child: DropdownButtonFormField<ExperienceCategory>(
                                  initialValue: _categoria,
                                  decoration: const InputDecoration(labelText: 'Categoría'),
                                  items: ExperienceCategory.values
                                      .map((c) => DropdownMenuItem(value: c, child: Text('${c.emoji} ${c.label}')))
                                      .toList(),
                                  onChanged: (v) => setState(() => _categoria = v!),
                                ),
                              ),
                              SizedBox(
                                width: campoAncho,
                                child: TextFormField(
                                  controller: _precio,
                                  decoration: const InputDecoration(
                                    labelText: 'Precio final COP *',
                                    prefixText: '\$ ',
                                  ),
                                  keyboardType: TextInputType.number,
                                  validator: (v) =>
                                      (double.tryParse(v ?? '') ?? 0) <= 0 ? 'Precio inválido' : null,
                                ),
                              ),
                              SizedBox(width: campoAncho, child: _campo(_duracion, 'Duración (ej. 1 día)', requerido: true)),
                            ],
                          ),
                        ],
                      );
                    },
                  ),
                ]),
                _seccion('Resumen y descripción', [
                  _campo(_resumen, 'Resumen corto', hint: 'Una frase que venda el plan'),
                  const SizedBox(height: 12),
                  _campo(_descripcion, 'Descripción completa', multiline: true),
                ]),
                _seccion('Qué incluye · precio final sin sorpresas', [
                  Wrap(
                    spacing: 10,
                    runSpacing: 0,
                    children: [
                      _switch('Transporte', _transporte, (v) => setState(() => _transporte = v)),
                      _switch('Comida', _comida, (v) => setState(() => _comida = v)),
                      _switch('Hospedaje', _hospedaje, (v) => setState(() => _hospedaje = v)),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: _incluye
                        .map((i) => InputChip(
                              label: Text(i),
                              onDeleted: () => setState(() => _incluye.remove(i)),
                            ))
                        .toList(),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Expanded(
                        child: TextFormField(
                          controller: _incluyeCtrl,
                          decoration: const InputDecoration(
                            labelText: 'Otro item (ej. Guía certificado)',
                            isDense: true,
                          ),
                          onFieldSubmitted: (v) {
                            if (v.trim().isNotEmpty) {
                              setState(() => _incluye.add(v.trim()));
                              _incluyeCtrl.clear();
                            }
                          },
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.add_rounded),
                        onPressed: () {
                          final v = _incluyeCtrl.text.trim();
                          if (v.isNotEmpty) {
                            setState(() => _incluye.add(v));
                            _incluyeCtrl.clear();
                          }
                        },
                      ),
                    ],
                  ),
                ]),
                _seccion('Itinerario', [
                  ..._itinerario.asMap().entries.map((e) {
                    final i = e.key;
                    final paso = e.value;
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Row(
                        children: [
                          SizedBox(
                            width: 110,
                            child: TextFormField(
                              initialValue: paso.hora,
                              decoration: const InputDecoration(hintText: '07:00', isDense: true),
                              onChanged: (v) => _itinerario[i] =
                                  ItinerarioPaso(hora: v, actividad: _itinerario[i].actividad),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: TextFormField(
                              initialValue: paso.actividad,
                              decoration: const InputDecoration(hintText: 'Actividad', isDense: true),
                              onChanged: (v) => _itinerario[i] =
                                  ItinerarioPaso(hora: _itinerario[i].hora, actividad: v),
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.delete_outline_rounded, size: 20),
                            onPressed: () => setState(() => _itinerario.removeAt(i)),
                          ),
                        ],
                      ),
                    );
                  }),
                  Align(
                    alignment: Alignment.centerLeft,
                    child: TextButton.icon(
                      onPressed: () => setState(
                          () => _itinerario.add(ItinerarioPaso(hora: '', actividad: ''))),
                      icon: const Icon(Icons.add_rounded, size: 18),
                      label: const Text('Agregar paso'),
                    ),
                  ),
                ]),
                _seccion('Encuentro, cancelación y fotos', [
                  _campo(_punto, 'Punto de encuentro'),
                  const SizedBox(height: 12),
                  _campo(_politica, 'Política de cancelación', multiline: true),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: _fotos
                        .map((f) => InputChip(
                              label: Text(
                                f.length > 42 ? '${f.substring(0, 42)}…' : f,
                                style: const TextStyle(fontSize: 11),
                              ),
                              onDeleted: () => setState(() => _fotos.remove(f)),
                            ))
                        .toList(),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Expanded(
                        child: TextFormField(
                          controller: _fotosCtrl,
                          decoration: const InputDecoration(
                            labelText: 'URL de foto',
                            isDense: true,
                            hintText: 'https://…',
                          ),
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.add_rounded),
                        onPressed: () {
                          final v = _fotosCtrl.text.trim();
                          if (v.startsWith('http')) {
                            setState(() => _fotos.add(v));
                            _fotosCtrl.clear();
                          }
                        },
                      ),
                    ],
                  ),
                ]),
                const SizedBox(height: 12),
                Text(
                  '* El precio es final: lo que ve el viajero es lo que paga, sin cargos ocultos (Anexo 4).',
                  style: TextStyle(fontSize: 12, color: cs.onSurfaceVariant),
                ),
                const SizedBox(height: 40),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _seccion(String titulo, List<Widget> hijos) {
    final cs = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: cs.surfaceContainerLow,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SectionLabel(titulo),
            ...hijos,
          ],
        ),
      ),
    );
  }

  Widget _campo(TextEditingController ctrl, String label,
      {bool multiline = false, bool requerido = false, String? hint}) {
    return TextFormField(
      controller: ctrl,
      maxLines: multiline ? 3 : 1,
      decoration: InputDecoration(labelText: label, hintText: hint),
      validator: requerido
          ? (v) => (v == null || v.trim().isEmpty) ? 'Campo requerido' : null
          : null,
    );
  }

  Widget _switch(String etiqueta, bool valor, ValueChanged<bool> onChanged) {
    return SizedBox(
      width: 150,
      child: SwitchListTile(
        dense: true,
        contentPadding: EdgeInsets.zero,
        title: Text(etiqueta, style: const TextStyle(fontSize: 13.5)),
        value: valor,
        onChanged: onChanged,
      ),
    );
  }
}
