import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/theme/app_insets.dart';
import '../../../core/theme/app_theme.dart';
import '../view_models/login_view_model.dart';
import '../widgets/formulario_login.dart';
import '../widgets/panel_marca.dart';

/// Acceso al viajero: en pantallas anchas muestra un panel de marca a la
/// izquierda (LayoutBuilder, según la skill de layouts responsivos). El estado vive en
/// [LoginViewModel] (MVVM).
class LoginView extends StatefulWidget {
  /// [mostrarCuentaDemo] ofrece «Usar cuenta demo»; solo en builds de debug (en release la clave de
  /// la cuenta de pruebas no debe estar a un toque).
  const LoginView({super.key, this.mostrarCuentaDemo = kDebugMode});

  final bool mostrarCuentaDemo;

  @override
  State<LoginView> createState() => _LoginViewState();
}

class _LoginViewState extends State<LoginView> {
  final _formKey = GlobalKey<FormState>();
  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  final _nombreCtrl = TextEditingController();
  late final LoginViewModel _viewModel;

  @override
  void initState() {
    super.initState();
    _viewModel = LoginViewModel(
      auth: context.read<AuthRepository>(),
      cuentaDemo: widget.mostrarCuentaDemo,
    );
  }

  @override
  void dispose() {
    _viewModel.dispose();
    _emailCtrl.dispose();
    _passCtrl.dispose();
    _nombreCtrl.dispose();
    super.dispose();
  }

  Future<void> _enviar() => _viewModel.enviar(
    formularioValido: _formKey.currentState!.validate(),
    nombre: _nombreCtrl.text,
    email: _emailCtrl.text,
    password: _passCtrl.text,
  );

  @override
  Widget build(BuildContext context) {
    final formulario = FormularioLogin(
      viewModel: _viewModel,
      formKey: _formKey,
      nombreCtrl: _nombreCtrl,
      emailCtrl: _emailCtrl,
      passCtrl: _passCtrl,
      onEnviar: _enviar,
    );
    return Scaffold(
      body: LayoutBuilder(
        builder: (context, constraints) {
          if (constraints.maxWidth > AppTheme.bpCompact) {
            return Row(
              children: [
                const Expanded(child: PanelMarca()),
                Expanded(child: Center(child: formulario)),
              ],
            );
          }
          return SafeArea(
            child: Center(
              child: SingleChildScrollView(padding: AppInsets.pantalla, child: formulario),
            ),
          );
        },
      ),
    );
  }
}
