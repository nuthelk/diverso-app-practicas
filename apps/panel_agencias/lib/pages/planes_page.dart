import 'package:flutter/material.dart';
import 'package:diverso_core/diverso_core.dart';

/// Gestión de planes: crear/editar, publicar y administrar fechas con cupos.
class PlanesPage extends StatefulWidget {
  const PlanesPage({super.key, required this.agencia});

  final AgencyRef agencia;

  @override
  State<PlanesPage> createState() => _PlanesPageState();
}

class _PlanesPageState extends State<PlanesPage> {
  final _servicio = AgencyService();
  late Future<List<Plan>> _future;

  @override
  void initState() {
    super.initState();
    _cargar();
  }

  void _cargar() {
    setState(() {
      _future = _servicio.misPlanes(widget.agencia.id);
    });
  }

  Future<void> _refrescar() async {
    setState(() {
      _future = _servicio.misPlanes(widget.agencia.id);
    });
    await _future;
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;

    return Scaffold(
      backgroundColor: cs.surfaceContainerLowest,
      floatingActionButton: FloatingActionButton.extended(
        icon: const Icon(Icons.add),
        label: const Text('Nuevo plan'),
        onPressed: () => _abrirForm(null),
      ),
      body: FutureBuilder<List<Plan>>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snap.hasError) {
            return Center(child: Text('Error: ${snap.error}'));
          }
          final planes = snap.data ?? const [];
          if (planes.isEmpty) {
            return const Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.map_outlined, size: 56, color: Colors.black26),
                  SizedBox(height: 12),
                  Text('Aún no tienes planes'),
                  Text('Crea tu primer plan turístico con el botón "Nuevo plan"',
                      style: TextStyle(color: Colors.black54)),
                ],
              ),
            );
          }
          return RefreshIndicator(
            onRefresh: _refrescar,
            child: ListView(
              padding: const EdgeInsets.all(20),
              children: planes.map((p) => _tarjetaPlan(context, p)).toList(),
            ),
          );
        },
      ),
    );
  }

  Widget _tarjetaPlan(BuildContext context, Plan p) {
    final cs = Theme.of(context).colorScheme;
    final publicado = p.estado == PlanStatus.publicado;
    final proximas = p.fechasDisponibles;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(p.titulo,
                      style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: publicado
                        ? Colors.green.withValues(alpha: .12)
                        : Colors.grey.withValues(alpha: .15),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    publicado ? 'Publicado' : 'Borrador',
                    style: TextStyle(
                      color: publicado ? Colors.green.shade700 : Colors.black54,
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              '${p.destino} · ${p.categoria.label} · ${p.duracionTexto} · '
              '${formatCOP(p.precioCop)} por persona · '
              '${p.reviewsCount} reseñas (★ ${p.ratingPromedio.toStringAsFixed(1)})',
              style: const TextStyle(color: Colors.black54, fontSize: 13),
            ),
            const SizedBox(height: 6),
            Text(
              proximas.isEmpty
                  ? 'Sin fechas futuras — agrega fechas para vender'
                  : '${proximas.length} fechas futuras · próximas: '
                  '${proximas.take(3).map((d) => formatFechaCorta(d.fecha)).join(', ')}',
              style: TextStyle(fontSize: 13, color: cs.primary),
            ),
            const Divider(height: 20),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                OutlinedButton.icon(
                  onPressed: () => _abrirForm(p),
                  icon: const Icon(Icons.edit_outlined, size: 17),
                  label: const Text('Editar'),
                ),
                OutlinedButton.icon(
                  onPressed: () => _dialogoFechas(p),
                  icon: const Icon(Icons.event_outlined, size: 17),
                  label: const Text('Fechas y cupos'),
                ),
                FilledButton.tonalIcon(
                  onPressed: () => _publicar(p, !publicado),
                  icon: Icon(
                    publicado ? Icons.visibility_off_outlined : Icons.publish,
                    size: 17,
                  ),
                  label: Text(publicado ? 'Despublicar' : 'Publicar'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _publicar(Plan p, bool publicar) async {
    final msg = ScaffoldMessenger.of(context);
    try {
      await _servicio.publicarPlan(p.id, publicado: publicar);
      msg.showSnackBar(SnackBar(
        content: Text(publicar
            ? '"${p.titulo}" publicado en el catálogo 🎉'
            : '"${p.titulo}" pasado a borrador.'),
      ));
      _refrescar();
    } on DiversoException catch (e) {
      msg.showSnackBar(SnackBar(content: Text(e.mensajeUsuario)));
    }
  }

  Future<void> _abrirForm(Plan? existente) async {
    final guardo = await showDialog<bool>(
      context: context,
      builder: (_) => PlanFormDialog(
        agencia: widget.agencia,
        draft: existente == null ? PlanDraft.vacio() : PlanDraft.dePlan(existente),
      ),
    );
    if (guardo == true) _refrescar();
  }

  Future<void> _dialogoFechas(Plan p) async {
    await showDialog(
      context: context,
      builder: (_) => _FechasDialog(plan: p, onCambio: _refrescar),
    );
    _refrescar();
  }
}

/// ---------------------------------------------------------------------
/// Formulario de plan (ficha estandarizada del Anexo 4)
/// ---------------------------------------------------------------------
class PlanFormDialog extends StatefulWidget {
  const PlanFormDialog({super.key, required this.agencia, required this.draft});

  final AgencyRef agencia;
  final PlanDraft draft;

  @override
  State<PlanFormDialog> createState() => _PlanFormDialogState();
}

class _PlanFormDialogState extends State<PlanFormDialog> {
  final _formKey = GlobalKey<FormState>();
  final _servicio = AgencyService();
  late final TextEditingController _titulo;
  late final TextEditingController _destino;
  late final TextEditingController _precio;
  late final TextEditingController _resumen;
  late final TextEditingController _descripcion;
  late final TextEditingController _duracion;
  late final TextEditingController _punto;
  late final TextEditingController _politica;
  late final TextEditingController _incluyeCtrl;
  late final TextEditingController _fotosCtrl;

  late ExperienceCategory _categoria;
  late bool _transporte;
  late bool _comida;
  late bool _hospedaje;
  late List<String> _incluye;
  late List<String> _fotos;
  late List<ItinerarioPaso> _itinerario;
  bool _enviando = false;

  @override
  void initState() {
    super.initState();
    final d = widget.draft;
    _titulo = TextEditingController(text: d.titulo);
    _destino = TextEditingController(text: d.destino);
    _precio =
        TextEditingController(text: d.precioCop > 0 ? d.precioCop.toStringAsFixed(0) : '');
    _resumen = TextEditingController(text: d.resumen);
    _descripcion = TextEditingController(text: d.descripcion);
    _duracion = TextEditingController(text: d.duracionTexto);
    _punto = TextEditingController(text: d.puntoEncuentro);
    _politica = TextEditingController(text: d.politicaCancelacion);
    _incluyeCtrl = TextEditingController();
    _fotosCtrl = TextEditingController();
    _categoria = d.categoria;
    _transporte = d.incluyeTransporte;
    _comida = d.incluyeComida;
    _hospedaje = d.incluyeHospedaje;
    _incluye = List.of(d.incluye);
    _fotos = List.of(d.fotos);
    _itinerario = List.of(d.itinerario);
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
    setState(() => _enviando = true);
    final nav = Navigator.of(context);
    final msg = ScaffoldMessenger.of(context);
    try {
      final draft = PlanDraft(
        id: widget.draft.id,
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
      if (draft.id == null) {
        await _servicio.crearPlan(widget.agencia.id, draft);
      } else {
        await _servicio.actualizarPlan(draft);
      }
      msg.showSnackBar(const SnackBar(content: Text('Plan guardado.')));
      nav.pop(true);
    } on DiversoException catch (e) {
      msg.showSnackBar(SnackBar(content: Text(e.mensajeUsuario)));
      setState(() => _enviando = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final esNuevo = widget.draft.id == null;
    return Dialog(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 760, maxHeight: 640),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Form(
            key: _formKey,
            child: Column(
              children: [
                Row(
                  children: [
                    Text(esNuevo ? 'Nuevo plan' : 'Editar plan',
                        style: Theme.of(context)
                            .textTheme
                            .titleLarge
                            ?.copyWith(fontWeight: FontWeight.w800)),
                    const Spacer(),
                    IconButton(
                        icon: const Icon(Icons.close),
                        onPressed: () => Navigator.pop(context)),
                  ],
                ),
                const Divider(),
                Expanded(
                  child: SingleChildScrollView(
                    child: Wrap(
                      spacing: 12,
                      runSpacing: 12,
                      children: [
                        SizedBox(
                            width: 340,
                            child: _campo(_titulo, 'Título del plan',
                                validator: true)),
                        SizedBox(
                            width: 150,
                            child: _campo(_destino, 'Destino', validator: true)),
                        SizedBox(
                            width: 180,
                            child: DropdownButtonFormField<ExperienceCategory>(
                          initialValue: _categoria,
                          decoration: const InputDecoration(
                              labelText: 'Categoría'),
                          items: ExperienceCategory.values
                              .map((c) => DropdownMenuItem(
                                  value: c, child: Text('${c.emoji} ${c.label}')))
                              .toList(),
                          onChanged: (v) => setState(() => _categoria = v!),
                        )),
                        SizedBox(
                            width: 150,
                            child: TextFormField(
                              controller: _precio,
                              decoration: const InputDecoration(
                                labelText: 'Precio final COP',
                                prefixText: '\$ ',
                              ),
                              keyboardType: TextInputType.number,
                              validator: (v) =>
                                  (double.tryParse(v ?? '') ?? 0) <= 0
                                      ? 'Precio inválido'
                                      : null,
                            )),
                        SizedBox(
                            width: 150,
                            child: _campo(_duracion, 'Duración (ej. 1 día)',
                                validator: true)),
                        SizedBox(width: 340, child: _campo(_punto, 'Punto de encuentro')),
                        SizedBox(
                            width: 340,
                            child: _campo(_resumen, 'Resumen corto',
                                hint: 'Una frase que venda el plan')),
                        SizedBox(
                            width: double.infinity,
                            child: _campo(_descripcion, 'Descripción completa',
                                multiline: true)),
                        SizedBox(
                          width: double.infinity,
                          child: Card(
                            child: Padding(
                              padding: const EdgeInsets.all(12),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text('Qué incluye (precio final sin sorpresas)',
                                      style: TextStyle(fontWeight: FontWeight.w700)),
                                  CheckboxListTile(
                                    dense: true,
                                    value: _transporte,
                                    onChanged: (v) =>
                                        setState(() => _transporte = v ?? false),
                                    title: const Text('Transporte'),
                                  ),
                                  CheckboxListTile(
                                    dense: true,
                                    value: _comida,
                                    onChanged: (v) => setState(() => _comida = v ?? false),
                                    title: const Text('Comida'),
                                  ),
                                  CheckboxListTile(
                                    dense: true,
                                    value: _hospedaje,
                                    onChanged: (v) =>
                                        setState(() => _hospedaje = v ?? false),
                                    title: const Text('Hospedaje'),
                                  ),
                                  const SizedBox(height: 4),
                                  Wrap(
                                    spacing: 6,
                                    runSpacing: 6,
                                    children: _incluye
                                        .map((i) => InputChip(
                                              label: Text(i),
                                              onDeleted: () =>
                                                  setState(() => _incluye.remove(i)),
                                            ))
                                        .toList(),
                                  ),
                                  const SizedBox(height: 8),
                                  Row(
                                    children: [
                                      Expanded(
                                        child: TextFormField(
                                          controller: _incluyeCtrl,
                                          decoration: const InputDecoration(
                                              labelText: 'Otro inclusione (ej. Guía certificado)',
                                              isDense: true),
                                          onFieldSubmitted: (v) {
                                            if (v.trim().isNotEmpty) {
                                              setState(() => _incluye.add(v.trim()));
                                              _incluyeCtrl.clear();
                                            }
                                          },
                                        ),
                                      ),
                                      IconButton(
                                        icon: const Icon(Icons.add),
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
                                ],
                              ),
                            ),
                          ),
                        ),
                        SizedBox(
                          width: double.infinity,
                          child: Card(
                            child: Padding(
                              padding: const EdgeInsets.all(12),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      const Text('Itinerario',
                                          style: TextStyle(fontWeight: FontWeight.w700)),
                                      const Spacer(),
                                      IconButton(
                                        tooltip: 'Agregar paso',
                                        icon: const Icon(Icons.add),
                                        onPressed: () => setState(() =>
                                            _itinerario.add(ItinerarioPaso(
                                                hora: '', actividad: ''))),
                                      ),
                                    ],
                                  ),
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
                                              decoration: const InputDecoration(
                                                  hintText: '07:00', isDense: true),
                                              onChanged: (v) => _itinerario[i] =
                                                  ItinerarioPaso(
                                                      hora: v,
                                                      actividad: paso.actividad),
                                            ),
                                          ),
                                          const SizedBox(width: 8),
                                          Expanded(
                                            child: TextFormField(
                                              initialValue: paso.actividad,
                                              decoration: const InputDecoration(
                                                  hintText: 'Actividad', isDense: true),
                                              onChanged: (v) => _itinerario[i] =
                                                  ItinerarioPaso(
                                                      hora: paso.hora, actividad: v),
                                            ),
                                          ),
                                          IconButton(
                                            icon: const Icon(Icons.delete_outline,
                                                size: 20),
                                            onPressed: () =>
                                                setState(() => _itinerario.removeAt(i)),
                                          ),
                                        ],
                                      ),
                                    );
                                  }),
                                ],
                              ),
                            ),
                          ),
                        ),
                        SizedBox(
                            width: double.infinity,
                            child: _campo(_politica, 'Política de cancelación',
                                multiline: true)),
                        SizedBox(
                          width: double.infinity,
                          child: Card(
                            child: Padding(
                              padding: const EdgeInsets.all(12),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text('Fotos (URLs)',
                                      style: TextStyle(fontWeight: FontWeight.w700)),
                                  const Text(
                                      'Pega URLs de fotos del plan. Ej: https://picsum.photos/seed/miplan/800/500',
                                      style:
                                          TextStyle(fontSize: 12, color: Colors.black45)),
                                  const SizedBox(height: 6),
                                  Wrap(
                                    spacing: 6,
                                    runSpacing: 6,
                                    children: _fotos
                                        .map((f) => InputChip(
                                              label: Text(
                                                f.length > 42 ? '${f.substring(0, 42)}…' : f,
                                                style: const TextStyle(fontSize: 11),
                                              ),
                                              onDeleted: () =>
                                                  setState(() => _fotos.remove(f)),
                                            ))
                                        .toList(),
                                  ),
                                  const SizedBox(height: 8),
                                  Row(
                                    children: [
                                      Expanded(
                                        child: TextFormField(
                                          controller: _fotosCtrl,
                                          decoration: const InputDecoration(
                                              labelText: 'URL de foto', isDense: true),
                                        ),
                                      ),
                                      IconButton(
                                        icon: const Icon(Icons.add),
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
                                ],
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const Divider(),
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    TextButton(
                      onPressed: () => Navigator.pop(context),
                      child: const Text('Cancelar'),
                    ),
                    const SizedBox(width: 8),
                    FilledButton.icon(
                      onPressed: _enviando ? null : _guardar,
                      icon: _enviando
                          ? const SizedBox(
                              height: 16,
                              width: 16,
                              child: CircularProgressIndicator(strokeWidth: 2))
                          : const Icon(Icons.save),
                      label: const Text('Guardar plan'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _campo(TextEditingController ctrl, String label,
      {bool multiline = false, bool validator = false, String? hint}) {
    return TextFormField(
      controller: ctrl,
      maxLines: multiline ? 3 : 1,
      decoration: InputDecoration(labelText: label, hintText: hint),
      validator: validator
          ? (v) => (v == null || v.trim().isEmpty) ? 'Campo requerido' : null
          : null,
    );
  }
}

/// ---------------------------------------------------------------------
/// Diálogo de fechas y cupos de un plan
/// ---------------------------------------------------------------------
class _FechasDialog extends StatefulWidget {
  const _FechasDialog({required this.plan, required this.onCambio});

  final Plan plan;
  final Future<void> Function() onCambio;

  @override
  State<_FechasDialog> createState() => _FechasDialogState();
}

class _FechasDialogState extends State<_FechasDialog> {
  final _servicio = AgencyService();
  DateTime _fechaSel = DateTime.now().add(const Duration(days: 1));
  final _cupoCtrl = TextEditingController(text: '15');
  late List<PlanDate> _fechas;

  @override
  void initState() {
    super.initState();
    final ahora = DateTime.now();
    _fechas = widget.plan.dates
        .where((d) => !d.fecha.isBefore(DateTime(ahora.year, ahora.month, ahora.day)))
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
    if (cupo <= 0) return;
    final msg = ScaffoldMessenger.of(context);
    try {
      await _servicio.agregarFecha(
          planId: widget.plan.id, fecha: _fechaSel, cupoTotal: cupo);
      await widget.onCambio();
      msg.showSnackBar(
          SnackBar(content: Text('Fecha ${formatFechaCorta(_fechaSel)} agregada.')));
      // recargar fechas desde el servicio
      final planes = await _servicio.misPlanes(widget.plan.agencyId);
      final actualizado = planes.firstWhere((p) => p.id == widget.plan.id);
      setState(() => _fechas = _ordenar(actualizado.dates));
    } on DiversoException catch (e) {
      msg.showSnackBar(SnackBar(content: Text(e.mensajeUsuario)));
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
    return Dialog(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 560, maxHeight: 620),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Fechas y cupos',
                  style: Theme.of(context)
                      .textTheme
                      .titleLarge
                      ?.copyWith(fontWeight: FontWeight.w800)),
              Text(widget.plan.titulo, style: const TextStyle(color: Colors.black54)),
              const Divider(height: 24),
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
                  const SizedBox(width: 8),
                  SizedBox(
                    width: 90,
                    child: TextFormField(
                      controller: _cupoCtrl,
                      decoration: const InputDecoration(labelText: 'Cupo'),
                      keyboardType: TextInputType.number,
                    ),
                  ),
                  const SizedBox(width: 8),
                  FilledButton.tonal(
                    onPressed: _agregar,
                    child: const Text('Agregar'),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Expanded(
                child: _fechas.isEmpty
                    ? const Center(
                        child: Text('Sin fechas futuras. Agrega la primera.'),
                      )
                    : ListView.builder(
                        itemCount: _fechas.length,
                        itemBuilder: (context, i) {
                          final d = _fechas[i];
                          return ListTile(
                            dense: true,
                            leading: const Icon(Icons.event),
                            title: Text(formatFechaLarga(d.fecha)),
                            subtitle: Text(
                                'Cupo ${d.cupoDisponible}/${d.cupoTotal}'
                                '${d.cupoDisponible == 0 ? ' · agotado' : ''}'),
                            trailing: IconButton(
                              icon: const Icon(Icons.delete_outline, size: 20),
                              tooltip: d.cupoDisponible == d.cupoTotal
                                  ? 'Eliminar fecha'
                                  : 'Solo se puede eliminar si no hay reservas',
                              onPressed: d.cupoDisponible == d.cupoTotal
                                  ? () async {
                                      await _servicio.eliminarFecha(d.id);
                                      setState(() => _fechas.removeAt(i));
                                      await widget.onCambio();
                                    }
                                  : null,
                            ),
                          );
                        },
                      ),
              ),
              Align(
                alignment: Alignment.centerRight,
                child: TextButton(
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
