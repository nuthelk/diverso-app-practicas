import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';

import 'consent_checkboxes.dart';

/// Pide la autorización vigente a cuentas que no la tienen (creadas antes
/// de la versión actual o tras un cambio de los documentos). No se puede
/// cerrar sin aceptar; la alternativa es cerrar sesión.
class ConsentView extends StatefulWidget {
  const ConsentView({super.key});

  @override
  State<ConsentView> createState() => _ConsentViewState();
}

class _ConsentViewState extends State<ConsentView> {
  final _auth = AuthService();
  bool _datos = false;
  bool _terminos = false;
  bool _intentado = false;
  bool _guardando = false;
  String? _error;

  Future<void> _aceptar() async {
    setState(() => _intentado = true);
    if (!_datos || !_terminos) return;
    setState(() {
      _guardando = true;
      _error = null;
    });
    try {
      final pendientes = await _auth.consentimientosPendientes();
      for (final tipo in pendientes) {
        await _auth.registrarConsentimiento(tipo);
      }
      if (mounted) Navigator.of(context).pop(true);
    } catch (_) {
      if (mounted) setState(() => _error = 'No pudimos guardar tu autorización. Intenta de nuevo.');
    } finally {
      if (mounted) setState(() => _guardando = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return PopScope(
      canPop: false,
      child: Scaffold(
        body: SafeArea(
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 460),
              child: ListView(
                shrinkWrap: true,
                padding: const EdgeInsets.all(24),
                children: [
                  Align(
                    alignment: Alignment.centerLeft,
                    child: Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: cs.primaryContainer,
                        borderRadius: BorderRadius.circular(18),
                      ),
                      child: Icon(Icons.privacy_tip_rounded, size: 28, color: cs.onPrimaryContainer),
                    ),
                  ),
                  const SizedBox(height: 18),
                  const Text(
                    'Antes de continuar',
                    style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800, letterSpacing: -.6),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Actualizamos nuestros documentos legales. Necesitamos tu autorización '
                    'expresa para seguir gestionando tu cuenta y tus reservas.',
                    style: TextStyle(fontSize: 14, height: 1.5, color: cs.onSurfaceVariant),
                  ),
                  const SizedBox(height: 20),
                  ConsentCheckboxes(
                    aceptaDatos: _datos,
                    aceptaTerminos: _terminos,
                    mostrarError: _intentado,
                    onDatos: (v) => setState(() => _datos = v),
                    onTerminos: (v) => setState(() => _terminos = v),
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 12),
                    Text(_error!, style: TextStyle(color: cs.error, fontSize: 13.5)),
                  ],
                  const SizedBox(height: 24),
                  FilledButton(
                    onPressed: _guardando ? null : _aceptar,
                    child: _guardando
                        ? const SizedBox(
                            height: 19,
                            width: 19,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Text('Aceptar y continuar'),
                  ),
                  const SizedBox(height: 8),
                  TextButton(
                    onPressed: _guardando ? null : () => _auth.signOut(),
                    child: const Text('Cerrar sesión'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
