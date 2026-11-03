import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../../router/app_routes.dart';
import '../../../core/theme/app_radii.dart';
import '../../../core/theme/app_text.dart';
import '../../../core/widgets/page/titulo_pagina.dart';
import '../../../core/widgets/section_label.dart';
import '../view_models/profile_view_model.dart';
import '../widgets/selector_apariencia.dart';
import '../widgets/tarjeta_info.dart';

/// Perfil del viajero: identidad, apariencia (claro/oscuro) y confianza. El estado vive en
/// [ProfileViewModel] (MVVM).
class ProfileView extends StatefulWidget {
  const ProfileView({super.key});

  @override
  State<ProfileView> createState() => _ProfileViewState();
}

class _ProfileViewState extends State<ProfileView> {
  late final ProfileViewModel _viewModel;

  @override
  void initState() {
    super.initState();
    _viewModel = ProfileViewModel(auth: context.read<AuthRepository>())..cargar();
  }

  @override
  void dispose() {
    _viewModel.dispose();
    super.dispose();
  }

  Future<void> _cerrarSesion() async {
    final msg = ScaffoldMessenger.of(context);
    if (!await _viewModel.cerrarSesion()) {
      msg.showSnackBar(
        const SnackBar(content: Text('No pudimos cerrar la sesión. Intenta de nuevo.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(title: const TituloPagina('Perfil')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
        children: [
          ListenableBuilder(listenable: _viewModel, builder: (context, _) => _identidad(cs)),
          const SizedBox(height: 28),
          const SectionLabel('Apariencia'),
          const SelectorApariencia(),
          const SizedBox(height: 24),
          const SectionLabel('Confianza'),
          const TarjetaInfo(
            icono: Icons.verified_user_rounded,
            titulo: 'Compra protegida',
            cuerpo:
                'Solo mostramos agencias con RNT vigente y matrícula mercantil '
                'verificadas por el equipo Diverso. Si una agencia cambia sus datos o '
                'se le vence el RNT, sus planes se ocultan hasta revalidarla.',
          ),
          const SizedBox(height: 12),
          const TarjetaInfo(
            icono: Icons.privacy_tip_rounded,
            titulo: 'Tus datos',
            cuerpo:
                'Tratamos tus datos conforme a la Ley 1581 de 2012 (Habeas Data), '
                'únicamente para gestionar tu cuenta y tus reservas. Puedes consultar, '
                'actualizar o pedir la supresión de tus datos en cualquier momento.',
          ),
          const SizedBox(height: 24),
          const SectionLabel('Documentos legales'),
          // Material (no Container con color): el ListTile pinta sus toques sobre el Material más cercano.
          Material(
            color: cs.surfaceContainerLow,
            borderRadius: BorderRadius.circular(AppRadios.card),
            clipBehavior: Clip.antiAlias,
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.shield_outlined),
                  title: const Text('Política de tratamiento de datos'),
                  subtitle: const Text('Versión $kVersionLegal'),
                  trailing: const Icon(Icons.chevron_right_rounded),
                  onTap: () => context.push(AppRoutes.legal('privacidad')),
                ),
                Divider(height: 1, indent: 56, color: cs.outlineVariant.withValues(alpha: .5)),
                ListTile(
                  leading: const Icon(Icons.description_outlined),
                  title: const Text('Términos y condiciones'),
                  subtitle: const Text('Versión $kVersionLegal'),
                  trailing: const Icon(Icons.chevron_right_rounded),
                  onTap: () => context.push(AppRoutes.legal('terminos-viajeros')),
                ),
              ],
            ),
          ),
          const SizedBox(height: 28),
          OutlinedButton.icon(
            style: OutlinedButton.styleFrom(foregroundColor: cs.error),
            onPressed: _cerrarSesion,
            icon: const Icon(Icons.logout_rounded, size: 18),
            label: const Text('Cerrar sesión'),
          ),
        ],
      ),
    );
  }

  /// Avatar, nombre y correo; si el perfil no cargó, un aviso con «Reintentar».
  Widget _identidad(ColorScheme cs) {
    final vm = _viewModel;
    return Center(
      child: Column(
        children: [
          CircleAvatar(
            radius: 38,
            backgroundColor: cs.primaryContainer,
            child: Text(
              vm.inicial,
              style: TextStyle(
                fontSize: AppText.encabezado3xl,
                fontWeight: FontWeight.w800,
                color: cs.onPrimaryContainer,
              ),
            ),
          ),
          const SizedBox(height: 12),
          Text(
            vm.nombre,
            style: const TextStyle(
              fontSize: AppText.encabezadoM,
              fontWeight: FontWeight.w800,
              letterSpacing: -.5,
            ),
          ),
          Text(
            vm.email,
            style: TextStyle(fontSize: AppText.detalle, color: cs.onSurfaceVariant),
          ),
          if (vm.error != null)
            Wrap(
              alignment: WrapAlignment.center,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                Text(
                  vm.error!,
                  style: TextStyle(fontSize: AppText.detalle, color: cs.error),
                ),
                TextButton(onPressed: vm.cargar, child: const Text('Reintentar')),
              ],
            ),
        ],
      ),
    );
  }
}
