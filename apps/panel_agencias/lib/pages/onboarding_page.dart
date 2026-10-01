import 'package:flutter/material.dart';
import 'package:diverso_core/diverso_core.dart';

/// Registro de la agencia con sus datos de formalidad (RNT + Cámara de
/// Comercio). Queda en estado "pendiente" hasta que el admin la verifique —
/// ese es el diferenciador de confianza del Anexo 4.
class OnboardingPage extends StatefulWidget {
  const OnboardingPage({
    super.key,
    required this.onRegistrada,
    required this.nombreContacto,
  });

  final VoidCallback onRegistrada;
  final String nombreContacto;

  @override
  State<OnboardingPage> createState() => _OnboardingPageState();
}

class _OnboardingPageState extends State<OnboardingPage> {
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
      await AgencyService().registrarAgencia(
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
        content: Text(
            'Agencia registrada. Queda pendiente de verificación por el equipo Diverso.'),
      ));
      widget.onRegistrada();
    } on DiversoException catch (e) {
      msg.showSnackBar(SnackBar(content: Text(e.mensajeUsuario)));
      setState(() => _enviando = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Registra tu agencia')),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 640),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(14),
                      child: Row(
                        children: [
                          Icon(Icons.verified_outlined,
                              color: Theme.of(context).colorScheme.primary),
                          const SizedBox(width: 10),
                          const Expanded(
                            child: Text(
                              'Solo listamos agencias formales. Verificaremos tu RNT y '
                              'matrícula mercantil antes de que puedas publicar planes: '
                              'así los viajeros confían.',
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                  _campo(_nombre, 'Nombre de la agencia', Icons.storefront),
                  const SizedBox(height: 12),
                  Row(children: [
                    Expanded(
                        child: _campo(_rnt, 'Número RNT', Icons.badge_outlined,
                            hint: 'Ej. 85421')),
                    const SizedBox(width: 12),
                    Expanded(
                        child: _campo(_matricula, 'Matrícula Cámara de Comercio',
                            Icons.business_center,
                            hint: 'Ej. 02345678-9')),
                  ]),
                  const SizedBox(height: 12),
                  Row(children: [
                    Expanded(child: _campo(_ciudad, 'Ciudad', Icons.location_city)),
                    const SizedBox(width: 12),
                    Expanded(
                        child: _campo(_telefono, 'Teléfono', Icons.phone_outlined)),
                  ]),
                  const SizedBox(height: 12),
                  Row(children: [
                    Expanded(child: _campo(_email, 'Email', Icons.mail_outline)),
                    const SizedBox(width: 12),
                    Expanded(
                        child: _campo(_whatsapp, 'WhatsApp', Icons.chat_outlined,
                            hint: '+57...')),
                  ]),
                  const SizedBox(height: 12),
                  _campo(_descripcion, 'Descripción de la agencia', Icons.notes,
                      multiline: true),
                  const SizedBox(height: 24),
                  FilledButton.icon(
                    style: FilledButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16)),
                    onPressed: _enviando ? null : _enviar,
                    icon: _enviando
                        ? const SizedBox(
                            height: 18,
                            width: 18,
                            child: CircularProgressIndicator(strokeWidth: 2))
                        : const Icon(Icons.send),
                    label: const Text('Enviar para verificación'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _campo(TextEditingController ctrl, String label, IconData icono,
      {String? hint, bool multiline = false}) {
    return TextFormField(
      controller: ctrl,
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        prefixIcon: Icon(icono),
      ),
      maxLines: multiline ? 3 : 1,
      validator: (v) =>
          (v == null || v.trim().isEmpty) ? 'Campo requerido' : null,
    );
  }
}
