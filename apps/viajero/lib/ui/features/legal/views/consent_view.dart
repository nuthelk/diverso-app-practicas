import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/theme/app_insets.dart';
import '../../../core/theme/app_radii.dart';
import '../../../core/theme/app_text.dart';
import '../view_models/consent_view_model.dart';
import '../widgets/consent_checkboxes.dart';

/// Pide la autorización vigente a cuentas que no la tienen (creadas antes
/// de la versión actual o tras un cambio de los documentos). No se puede
/// cerrar sin aceptar; la alternativa es cerrar sesión.
///
/// Es el destino del redirect por consentimiento ([ConsentViewModel]): si no se pudo verificar
/// qué falta aceptar, muestra un aviso con «Reintentar» en vez de dejar pasar. Al aceptar, el
/// router saca al usuario de aquí.
class ConsentView extends StatefulWidget {
  const ConsentView({super.key});

  @override
  State<ConsentView> createState() => _ConsentViewState();
}

class _ConsentViewState extends State<ConsentView> {
  bool _datos = false;
  bool _terminos = false;
  bool _intentado = false;
  bool _guardando = false;
  String? _error;

  Future<void> _aceptar(ConsentViewModel consentimiento) async {
    setState(() => _intentado = true);
    if (!_datos || !_terminos) return;
    setState(() {
      _guardando = true;
      _error = null;
    });
    final guardado = await consentimiento.aceptar();
    if (!mounted) return;
    setState(() {
      _guardando = false;
      if (!guardado) _error = 'No pudimos guardar tu autorización. Intenta de nuevo.';
    });
  }

  /// No se pudo saber qué falta aceptar: no se deja pasar, se avisa y se ofrece reintentar.
  List<Widget> _sinVerificar(ConsentViewModel consentimiento, ColorScheme cs) => [
    Container(
      padding: AppInsets.tarjeta,
      decoration: BoxDecoration(
        color: cs.errorContainer,
        borderRadius: BorderRadius.circular(AppRadios.field),
      ),
      child: Text(
        'No pudimos verificar tu autorización. Revisa tu conexión e intenta de nuevo.',
        style: TextStyle(color: cs.onErrorContainer, fontSize: AppText.cuerpoChico, height: 1.4),
      ),
    ),
    const SizedBox(height: 16),
    FilledButton(onPressed: consentimiento.reintentar, child: const Text('Reintentar')),
  ];

  List<Widget> _formulario(ConsentViewModel consentimiento, ColorScheme cs) => [
    ConsentCheckboxes(
      aceptaDatos: _datos,
      aceptaTerminos: _terminos,
      mostrarError: _intentado,
      onDatos: (v) => setState(() => _datos = v),
      onTerminos: (v) => setState(() => _terminos = v),
    ),
    if (_error != null) ...[
      const SizedBox(height: 12),
      Text(
        _error!,
        style: TextStyle(color: cs.error, fontSize: AppText.cuerpoChico),
      ),
    ],
    const SizedBox(height: 24),
    FilledButton(
      onPressed: _guardando ? null : () => _aceptar(consentimiento),
      child: _guardando
          ? const SizedBox(height: 19, width: 19, child: CircularProgressIndicator(strokeWidth: 2))
          : const Text('Aceptar y continuar'),
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final consentimiento = context.watch<ConsentViewModel>();
    return PopScope(
      canPop: false,
      child: Scaffold(
        body: SafeArea(
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 460),
              child: ListView(
                shrinkWrap: true,
                padding: AppInsets.pantalla,
                children: [
                  Align(
                    alignment: Alignment.centerLeft,
                    child: Container(
                      padding: AppInsets.tarjeta,
                      decoration: BoxDecoration(
                        color: cs.primaryContainer,
                        borderRadius: BorderRadius.circular(18),
                      ),
                      child: Icon(
                        Icons.privacy_tip_rounded,
                        size: 28,
                        color: cs.onPrimaryContainer,
                      ),
                    ),
                  ),
                  const SizedBox(height: 18),
                  const Text(
                    'Antes de continuar',
                    style: TextStyle(
                      fontSize: AppText.encabezadoXl,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -.6,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Actualizamos nuestros documentos legales. Necesitamos tu autorización '
                    'expresa para seguir gestionando tu cuenta y tus reservas.',
                    style: TextStyle(
                      fontSize: AppText.cuerpo,
                      height: 1.5,
                      color: cs.onSurfaceVariant,
                    ),
                  ),
                  const SizedBox(height: 20),
                  if (consentimiento.estado == EstadoConsentimiento.error)
                    ..._sinVerificar(consentimiento, cs)
                  else if (consentimiento.estado == EstadoConsentimiento.verificando && !_guardando)
                    const Center(child: CircularProgressIndicator())
                  else
                    ..._formulario(consentimiento, cs),
                  const SizedBox(height: 8),
                  TextButton(
                    onPressed: _guardando ? null : consentimiento.cerrarSesion,
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
