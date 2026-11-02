import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../router/app_routes.dart';
import '../../../core/theme/app_theme.dart';
import '../../legal/widgets/consent_checkboxes.dart';
import '../view_models/login_view_model.dart';

/// Formulario de acceso (entrar o crear cuenta). Los campos y la clave del formulario son de la
/// pantalla (sobreviven al cambio de diseño ancho/angosto); lo demás sale del [LoginViewModel].
class FormularioLogin extends StatelessWidget {
  const FormularioLogin({
    super.key,
    required this.viewModel,
    required this.formKey,
    required this.nombreCtrl,
    required this.emailCtrl,
    required this.passCtrl,
    required this.onEnviar,
  });

  final LoginViewModel viewModel;
  final GlobalKey<FormState> formKey;
  final TextEditingController nombreCtrl;
  final TextEditingController emailCtrl;
  final TextEditingController passCtrl;
  final VoidCallback onEnviar;

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: viewModel,
      builder: (context, _) => _formulario(context, viewModel),
    );
  }

  Widget _formulario(BuildContext context, LoginViewModel vm) {
    final cs = Theme.of(context).colorScheme;
    return ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 400),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24),
        child: Form(
          key: formKey,
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
                vm.esRegistro ? 'Crea tu cuenta' : 'Bienvenido de vuelta',
                style: const TextStyle(
                  fontSize: 26,
                  fontWeight: FontWeight.w800,
                  letterSpacing: -.8,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                vm.esRegistro
                    ? 'Explora y reserva planes de agencias verificadas.'
                    : 'Entra para seguir explorando Antioquia.',
                style: TextStyle(fontSize: 14, color: cs.onSurfaceVariant),
              ),
              const SizedBox(height: 26),
              if (vm.esRegistro) ...[
                TextFormField(
                  controller: nombreCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Tu nombre',
                    prefixIcon: Icon(Icons.person_outline_rounded),
                  ),
                  textCapitalization: TextCapitalization.words,
                  validator: (v) => (v == null || v.trim().length < 2) ? 'Escribe tu nombre' : null,
                ),
                const SizedBox(height: 12),
              ],
              TextFormField(
                controller: emailCtrl,
                decoration: const InputDecoration(
                  labelText: 'Correo',
                  prefixIcon: Icon(Icons.mail_outline_rounded),
                ),
                keyboardType: TextInputType.emailAddress,
                validator: (v) => (v == null || !v.contains('@')) ? 'Correo inválido' : null,
                onFieldSubmitted: (_) => onEnviar(),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: passCtrl,
                decoration: const InputDecoration(
                  labelText: 'Contraseña',
                  prefixIcon: Icon(Icons.lock_outline_rounded),
                ),
                obscureText: true,
                validator: (v) => (v == null || v.length < 6) ? 'Mínimo 6 caracteres' : null,
                onFieldSubmitted: (_) => onEnviar(),
              ),
              if (vm.esRegistro) ...[
                const SizedBox(height: 14),
                ConsentCheckboxes(
                  aceptaDatos: vm.aceptaDatos,
                  aceptaTerminos: vm.aceptaTerminos,
                  mostrarError: vm.intentoRegistro,
                  onDatos: vm.cambiarAceptaDatos,
                  onTerminos: vm.cambiarAceptaTerminos,
                ),
              ],
              if (vm.error != null) ...[
                const SizedBox(height: 14),
                Text(
                  vm.error!,
                  textAlign: TextAlign.center,
                  style: TextStyle(color: cs.error, fontSize: 13.5),
                ),
              ],
              const SizedBox(height: 22),
              FilledButton(
                onPressed: vm.cargando ? null : onEnviar,
                child: vm.cargando
                    ? const SizedBox(
                        height: 19,
                        width: 19,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : Text(vm.esRegistro ? 'Crear cuenta' : 'Entrar'),
              ),
              const SizedBox(height: 8),
              TextButton(
                onPressed: vm.alternarModo,
                child: Text(vm.esRegistro ? 'Ya tengo cuenta — entrar' : 'Crear cuenta nueva'),
              ),
              if (vm.ofreceCuentaDemo) ...[
                const SizedBox(height: 16),
                OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size.fromHeight(46),
                    foregroundColor: cs.onSurface,
                  ),
                  onPressed: () {
                    emailCtrl.text = LoginViewModel.correoDemo;
                    passCtrl.text = LoginViewModel.claveDemo;
                  },
                  icon: const Icon(Icons.science_outlined, size: 18),
                  label: const Text('Usar cuenta demo'),
                ),
              ],
              const SizedBox(height: 18),
              Wrap(
                alignment: WrapAlignment.center,
                children: [
                  TextButton(
                    style: TextButton.styleFrom(
                      foregroundColor: cs.onSurfaceVariant,
                      textStyle: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600),
                    ),
                    onPressed: () => context.push(AppRoutes.legal('privacidad')),
                    child: const Text('Política de datos'),
                  ),
                  TextButton(
                    style: TextButton.styleFrom(
                      foregroundColor: cs.onSurfaceVariant,
                      textStyle: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600),
                    ),
                    onPressed: () => context.push(AppRoutes.legal('terminos-viajeros')),
                    child: const Text('Términos y condiciones'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
