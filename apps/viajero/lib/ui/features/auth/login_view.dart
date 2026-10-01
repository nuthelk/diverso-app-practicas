import 'package:flutter/material.dart';
import 'package:diverso_core/diverso_core.dart';

import '../../core/app_theme.dart';

/// Acceso al viajero: en pantallas anchas muestra un panel de marca a la
/// izquierda (LayoutBuilder, según la skill de layouts responsivos).
class LoginView extends StatefulWidget {
  const LoginView({super.key});

  @override
  State<LoginView> createState() => _LoginViewState();
}

class _LoginViewState extends State<LoginView> {
  final _formKey = GlobalKey<FormState>();
  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  final _nombreCtrl = TextEditingController();
  final _auth = AuthService();
  bool _esRegistro = false;
  bool _cargando = false;
  String? _error;

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passCtrl.dispose();
    _nombreCtrl.dispose();
    super.dispose();
  }

  Future<void> _enviar() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _cargando = true;
      _error = null;
    });
    try {
      if (_esRegistro) {
        await _auth.signUpViajero(
          nombre: _nombreCtrl.text.trim(),
          email: _emailCtrl.text.trim(),
          password: _passCtrl.text,
        );
      } else {
        await _auth.signIn(email: _emailCtrl.text.trim(), password: _passCtrl.text);
      }
    } catch (e) {
      setState(() => _error = 'Credenciales inválidas o error de conexión.');
    } finally {
      if (mounted) setState(() => _cargando = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: LayoutBuilder(
        builder: (context, constraints) {
          final ancho = constraints.maxWidth;
          if (ancho > AppTheme.bpCompact) {
            return Row(
              children: [
                Expanded(child: _panelMarca(context)),
                Expanded(child: Center(child: _formulario(context))),
              ],
            );
          }
          return SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(24),
                child: _formulario(context),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _panelMarca(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      color: cs.primary,
      padding: const EdgeInsets.all(48),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          DiversoLogo(size: 64, color: cs.onPrimary),
          const SizedBox(height: 20),
          Text(
            'Diverso',
            style: TextStyle(
              fontSize: 42,
              fontWeight: FontWeight.w800,
              letterSpacing: -1.5,
              color: cs.onPrimary,
            ),
          ),
          const SizedBox(height: 12),
          ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 380),
            child: Text(
              'Planes turísticos de agencias antioqueñas verificadas. '
              'Precio final desde el inicio, cupos reales y pago protegido.',
              style: TextStyle(
                fontSize: 16,
                height: 1.55,
                color: cs.onPrimary.withValues(alpha: .85),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _formulario(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 400),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24),
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Marca compacta (visible en móvil)
              LayoutBuilder(
                builder: (context, c) => c.maxWidth < AppTheme.bpCompact
                    ? Column(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: cs.primaryContainer,
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: DiversoLogo(size: 42, color: cs.onPrimaryContainer),
                          ),
                          const SizedBox(height: 14),
                        ],
                      )
                    : const SizedBox.shrink(),
              ),
              Text(
                _esRegistro ? 'Crea tu cuenta' : 'Bienvenido de vuelta',
                style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w800, letterSpacing: -.8),
              ),
              const SizedBox(height: 6),
              Text(
                _esRegistro
                    ? 'Explora y reserva planes de agencias verificadas.'
                    : 'Entra para seguir explorando Antioquia.',
                style: TextStyle(fontSize: 14, color: cs.onSurfaceVariant),
              ),
              const SizedBox(height: 26),
              if (_esRegistro) ...[
                TextFormField(
                  controller: _nombreCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Tu nombre',
                    prefixIcon: Icon(Icons.person_outline_rounded),
                  ),
                  textCapitalization: TextCapitalization.words,
                  validator: (v) =>
                      (v == null || v.trim().length < 2) ? 'Escribe tu nombre' : null,
                ),
                const SizedBox(height: 12),
              ],
              TextFormField(
                controller: _emailCtrl,
                decoration: const InputDecoration(
                  labelText: 'Correo',
                  prefixIcon: Icon(Icons.mail_outline_rounded),
                ),
                keyboardType: TextInputType.emailAddress,
                validator: (v) => (v == null || !v.contains('@')) ? 'Correo inválido' : null,
                onFieldSubmitted: (_) => _enviar(),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _passCtrl,
                decoration: const InputDecoration(
                  labelText: 'Contraseña',
                  prefixIcon: Icon(Icons.lock_outline_rounded),
                ),
                obscureText: true,
                validator: (v) => (v == null || v.length < 6) ? 'Mínimo 6 caracteres' : null,
                onFieldSubmitted: (_) => _enviar(),
              ),
              if (_error != null) ...[
                const SizedBox(height: 14),
                Text(_error!, textAlign: TextAlign.center,
                    style: TextStyle(color: cs.error, fontSize: 13.5)),
              ],
              const SizedBox(height: 22),
              FilledButton(
                onPressed: _cargando ? null : _enviar,
                child: _cargando
                    ? const SizedBox(
                        height: 19,
                        width: 19,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : Text(_esRegistro ? 'Crear cuenta' : 'Entrar'),
              ),
              const SizedBox(height: 8),
              TextButton(
                onPressed: () => setState(() {
                  _esRegistro = !_esRegistro;
                  _error = null;
                }),
                child: Text(_esRegistro ? 'Ya tengo cuenta — entrar' : 'Crear cuenta nueva'),
              ),
              const SizedBox(height: 16),
              OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size.fromHeight(46),
                  foregroundColor: cs.onSurface,
                ),
                onPressed: () {
                  _emailCtrl.text = 'viajero@demo.com';
                  _passCtrl.text = 'demo1234';
                },
                icon: const Icon(Icons.science_outlined, size: 18),
                label: const Text('Usar cuenta demo'),
              ),
              const SizedBox(height: 22),
              Text(
                'Al continuar aceptas el tratamiento de tus datos conforme a la '
                'Ley 1581 de 2012 (Habeas Data). Los usamos únicamente para '
                'gestionar tus reservas.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 11.5, height: 1.5, color: cs.outline),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
