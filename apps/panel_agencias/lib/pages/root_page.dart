import 'package:flutter/material.dart';
import 'package:diverso_core/diverso_core.dart';

import 'admin_page.dart';
import 'agency_shell.dart';
import 'onboarding_page.dart';

/// Decide qué ve el usuario: admin (verificación), agencia registrada
/// (panel completo) o agencia sin registrar (onboarding).
class RootPage extends StatefulWidget {
  const RootPage({super.key});

  @override
  State<RootPage> createState() => _RootPageState();
}

class _RootPageState extends State<RootPage> {
  final _auth = AuthService();
  late Future<(Profile, AgencyRef?)> _future;

  @override
  void initState() {
    super.initState();
    _cargar();
  }

  void _cargar() {
    _future = () async {
      final perfil = await _auth.currentProfile();
      final agencia = await AgencyService().miAgencia();
      return (perfil, agencia);
    }();
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<(Profile, AgencyRef?)>(
      future: _future,
      builder: (context, snap) {
        if (snap.connectionState != ConnectionState.done) {
          return const Scaffold(body: Center(child: CircularProgressIndicator()));
        }
        if (snap.hasError) {
          return Scaffold(
            body: Center(child: Text('Error: ${snap.error}')),
          );
        }
        final (perfil, agencia) = snap.data!;

        if (perfil.rol == UserRole.admin) {
          return AdminPage(onChanged: _cargar);
        }
        if (agencia == null) {
          return OnboardingPage(
            onRegistrada: _cargar,
            nombreContacto: perfil.nombre,
          );
        }
        return AgencyShell(perfil: perfil, agencia: agencia);
      },
    );
  }
}
