import 'package:flutter/material.dart';
import 'package:diverso_core/diverso_core.dart';

/// Acceso al panel: credenciales de la agencia o admin, con chips demo.
class LoginView extends StatefulWidget {
  const LoginView({super.key});

  @override
  State<LoginView> createState() => _LoginViewState();
}

class _LoginViewState extends State<LoginView> {
  final _formKey = GlobalKey<FormState>();
  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  final _auth = AuthService();
  bool _cargando = false;
  String? _error;

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passCtrl.dispose();
    super.dispose();
  }

  void _rellenar(String email) {
    _emailCtrl.text = email;
    _passCtrl.text = 'demo1234';
    setState(() => _error = null);
  }

  Future<void> _entrar() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _cargando = true;
      _error = null;
    });
    try {
      await _auth.signIn(email: _emailCtrl.text.trim(), password: _passCtrl.text);
      // El redirect del router lleva a /starter, que decide el destino.
    } catch (e) {
      setState(() => _error = 'Credenciales inválidas o error de conexión.');
    } finally {
      if (mounted) setState(() => _cargando = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;

    return Scaffold(
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(28),
          child: Container(
            constraints: const BoxConstraints(maxWidth: 420),
            padding: const EdgeInsets.all(32),
            decoration: BoxDecoration(
              color: cs.surfaceContainerLow,
              borderRadius: BorderRadius.circular(28),
            ),
            child: Form(
              key: _formKey,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Container(
                    width: 56,
                    height: 56,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: cs.primaryContainer,
                      borderRadius: BorderRadius.circular(18),
                    ),
                    child: Icon(Icons.terrain_rounded, color: cs.onPrimaryContainer, size: 28),
                  ),
                  const SizedBox(height: 18),
                  const Text(
                    'Diverso · Agencias',
                    style: TextStyle(fontSize: 23, fontWeight: FontWeight.w800, letterSpacing: -.6),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Publica planes, gestiona cupos y concilia tus pagos.',
                    style: TextStyle(fontSize: 13.5, color: cs.onSurfaceVariant),
                  ),
                  const SizedBox(height: 24),
                  TextFormField(
                    controller: _emailCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Correo de la agencia',
                      prefixIcon: Icon(Icons.mail_outline_rounded),
                    ),
                    validator: (v) => (v == null || !v.contains('@')) ? 'Correo inválido' : null,
                    onFieldSubmitted: (_) => _entrar(),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _passCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Contraseña',
                      prefixIcon: Icon(Icons.lock_outline_rounded),
                    ),
                    obscureText: true,
                    validator: (v) => (v == null || v.isEmpty) ? 'Escribe tu contraseña' : null,
                    onFieldSubmitted: (_) => _entrar(),
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 12),
                    Text(_error!, textAlign: TextAlign.center,
                        style: TextStyle(color: cs.error, fontSize: 13.5)),
                  ],
                  const SizedBox(height: 20),
                  FilledButton(
                    onPressed: _cargando ? null : _entrar,
                    child: _cargando
                        ? const SizedBox(
                            height: 19, width: 19, child: CircularProgressIndicator(strokeWidth: 2))
                        : const Text('Entrar'),
                  ),
                  const SizedBox(height: 22),
                  _ChipsDemo(onSeleccionar: _rellenar),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _ChipsDemo extends StatelessWidget {
  const _ChipsDemo({required this.onSeleccionar});

  final void Function(String email) onSeleccionar;

  static const _cuentas = [
    ('Agencia verificada', 'graffiti@demo.com'),
    ('En verificación', 'patrimonio@demo.com'),
    ('Admin', 'admin@demo.com'),
  ];

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'CUENTAS DEMO · CONTRASEÑA demo1234',
          style: TextStyle(
            fontSize: 10.5,
            fontWeight: FontWeight.w700,
            letterSpacing: 1.2,
            color: cs.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: 10),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: _cuentas
              .map((c) => ActionChip(
                    label: Text(c.$1),
                    onPressed: () => onSeleccionar(c.$2),
                  ))
              .toList(),
        ),
      ],
    );
  }
}
