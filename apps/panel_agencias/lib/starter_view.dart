import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:diverso_core/diverso_core.dart';
import 'package:provider/provider.dart';

/// Pantalla de arranque: decide a dónde va cada usuario según su rol y
/// si ya registró su agencia (viaje completo del onboarding).
class StarterView extends StatefulWidget {
  const StarterView({super.key});

  @override
  State<StarterView> createState() => _StarterViewState();
}

class _StarterViewState extends State<StarterView> {
  @override
  void initState() {
    super.initState();
    _decidir();
  }

  Future<void> _decidir() async {
    await Future.delayed(const Duration(milliseconds: 150));
    if (!mounted) return;
    final auth = context.read<AuthRepository>();
    final agencias = context.read<AgencyRepository>();
    if (auth.currentUserId == null) {
      context.go('/login');
      return;
    }
    try {
      final perfil = await auth.currentProfile();
      if (!mounted) return;
      if (perfil.rol == UserRole.admin) {
        context.go('/admin');
        return;
      }
      final agencia = await agencias.miAgencia();
      if (!mounted) return;
      context.go(agencia == null ? '/onboarding' : '/dashboard');
    } catch (_) {
      if (mounted) context.go('/login');
    }
  }

  @override
  Widget build(BuildContext context) {
    return const Scaffold(body: Center(child: CircularProgressIndicator()));
  }
}
