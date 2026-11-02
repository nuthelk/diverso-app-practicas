import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:diverso_core/diverso_core.dart';
import 'package:provider/provider.dart';

import '../../core/app_theme.dart';

/// Registro de la agencia con sus datos de formalidad (RNT + Cámara de
/// Comercio). Queda pendiente hasta que el admin la verifique.
class OnboardingView extends StatefulWidget {
  const OnboardingView({super.key});

  @override
  State<OnboardingView> createState() => _OnboardingViewState();
}

class _OnboardingViewState extends State<OnboardingView> {
  final _formKey = GlobalKey<FormState>();
  final _nombre = TextEditingController();
  final _rnt = TextEditingController();
  final _matricula = TextEditingController();
  final _ciudad = TextEditingController(text: 'Medellín');
  final _telefono = TextEditingController();
  final _email = TextEditingController();
  final _whatsapp = TextEditingController();
  final _descripcion = TextEditingController();
  bool _enviando = false;

  @override
  void dispose() {
    _nombre.dispose();
    _rnt.dispose();
    _matricula.dispose();
    _ciudad.dispose();
    _telefono.dispose();
    _email.dispose();
    _whatsapp.dispose();
    _descripcion.dispose();
    super.dispose();
  }

  Future<void> _enviar() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _enviando = true);
    final msg = ScaffoldMessenger.of(context);
    try {
      await context.read<AgencyRepository>().registrarAgencia(
        nombre: _nombre.text.trim(),
        numeroRnt: _rnt.text.trim(),
        matriculaCamaraComercio: _matricula.text.trim(),
        ciudad: _ciudad.text.trim(),
        telefono: _telefono.text.trim(),
        email: _email.text.trim(),
        whatsapp: _whatsapp.text.trim(),
        descripcion: _descripcion.text.trim(),
      );
      msg.showSnackBar(const SnackBar(
        content: Text('Agencia registrada. Queda pendiente de verificación por el equipo Diverso.'),
      ));
      if (mounted) context.go('/dashboard');
    } on DiversoException catch (e) {
      msg.showSnackBar(SnackBar(content: Text(e.mensajeUsuario)));
      if (mounted) setState(() => _enviando = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;

    return Scaffold(
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 1080),
          child: LayoutBuilder(
            builder: (context, constraints) {
              final dosColumnas = constraints.maxWidth > AppTheme.bpCompact + 200;
              return Row(
                children: [
                  if (dosColumnas)
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsets.all(48),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              padding: const EdgeInsets.all(14),
                              decoration: BoxDecoration(
                                color: cs.primaryContainer,
                                borderRadius: BorderRadius.circular(16),
                              ),
                              child: DiversoLogo(size: 30, color: cs.onPrimaryContainer),
                            ),
                            const SizedBox(height: 22),
                            const Text(
                              'Únete a las agencias verificadas de Antioquia',
                              style: TextStyle(
                                  fontSize: 32, fontWeight: FontWeight.w800, letterSpacing: -1, height: 1.15),
                            ),
                            const SizedBox(height: 14),
                            ConstrainedBox(
                              constraints: const BoxConstraints(maxWidth: 420),
                              child: Text(
                                'Solo listamos agencias formales. Verificamos tu RNT y tu matrícula '
                                'mercantil antes de publicar: así los viajeros confían y compran.',
                                style: TextStyle(
                                  fontSize: 15,
                                  height: 1.55,
                                  color: cs.onSurfaceVariant,
                                ),
                              ),
                            ),
                            const SizedBox(height: 24),
                            _punto(context, Icons.verified_rounded, 'Sello "Verificada RNT" en tus planes'),
                            _punto(context, Icons.payments_rounded, 'Comisión justa del 12% por venta'),
                            _punto(context, Icons.inventory_rounded, 'Cupos en tiempo real, sin sobreventas'),
                          ],
                        ),
                      ),
                    ),
                  Expanded(
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.all(28),
                      child: Form(
                        key: _formKey,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            const Text(
                              'Registra tu agencia',
                              style:
                                  TextStyle(fontSize: 24, fontWeight: FontWeight.w800, letterSpacing: -.7),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Tus datos de formalidad nos permiten verificar tu registro.',
                              style: TextStyle(fontSize: 13.5, color: cs.onSurfaceVariant),
                            ),
                            const SizedBox(height: 22),
                            _campo(_nombre, 'Nombre de la agencia', Icons.storefront_rounded),
                            const SizedBox(height: 12),
                            Row(children: [
                              Expanded(child: _campo(_rnt, 'Número RNT', Icons.badge_outlined, hint: 'Ej. 85421')),
                              const SizedBox(width: 12),
                              Expanded(child: _campo(_matricula, 'Matrícula C. de Comercio',
                                  Icons.business_center_rounded,
                                  hint: 'Ej. 02345678-9')),
                            ]),
                            const SizedBox(height: 12),
                            Row(children: [
                              Expanded(child: _campo(_ciudad, 'Ciudad', Icons.location_city_rounded)),
                              const SizedBox(width: 12),
                              Expanded(child: _campo(_telefono, 'Teléfono', Icons.phone_outlined)),
                            ]),
                            const SizedBox(height: 12),
                            Row(children: [
                              Expanded(child: _campo(_email, 'Email', Icons.mail_outline_rounded)),
                              const SizedBox(width: 12),
                              Expanded(child: _campo(_whatsapp, 'WhatsApp', Icons.chat_outlined,
                                  hint: '+57…')),
                            ]),
                            const SizedBox(height: 12),
                            _campo(_descripcion, 'Descripción de la agencia', Icons.notes_rounded,
                                multiline: true),
                            const SizedBox(height: 24),
                            FilledButton.icon(
                              onPressed: _enviando ? null : _enviar,
                              icon: _enviando
                                  ? const SizedBox(
                                      width: 17,
                                      height: 17,
                                      child: CircularProgressIndicator(strokeWidth: 2))
                                  : const Icon(Icons.send_rounded, size: 18),
                              label: const Text('Enviar para verificación'),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }

  Widget _punto(BuildContext context, IconData icono, String texto) {
    final cs = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Icon(icono, size: 19, color: cs.primary),
          const SizedBox(width: 12),
          Text(texto, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
        ],
      ),
    );
  }

  Widget _campo(TextEditingController ctrl, String label, IconData icono,
      {String? hint, bool multiline = false}) {
    return TextFormField(
      controller: ctrl,
      maxLines: multiline ? 3 : 1,
      decoration: InputDecoration(labelText: label, hintText: hint, prefixIcon: Icon(icono)),
      validator: (v) => (v == null || v.trim().isEmpty) ? 'Campo requerido' : null,
    );
  }
}
