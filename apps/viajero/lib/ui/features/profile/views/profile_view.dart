import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../core/theme/app_radii.dart';
import '../../../core/theme/theme_mode_view_model.dart';
import '../../../core/widgets/page/titulo_pagina.dart';
import '../../../core/widgets/section_label.dart';

/// Perfil del viajero: identidad, apariencia (claro/oscuro) y confianza.
class ProfileView extends StatefulWidget {
  const ProfileView({super.key});

  @override
  State<ProfileView> createState() => _ProfileViewState();
}

class _ProfileViewState extends State<ProfileView> {
  late final AuthService _auth;
  Profile? _perfil;

  @override
  void initState() {
    super.initState();
    _auth = context.read<AuthService>();
    _cargar();
  }

  Future<void> _cargar() async {
    try {
      final p = await _auth.currentProfile();
      if (mounted) setState(() => _perfil = p);
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final email = _auth.currentUserEmail ?? '';
    final nombre = _perfil?.nombre ?? 'Viajero';
    final inicial = nombre.isEmpty ? 'V' : nombre.substring(0, 1).toUpperCase();

    return Scaffold(
      appBar: AppBar(title: const TituloPagina('Perfil')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
        children: [
          Center(
            child: Column(
              children: [
                CircleAvatar(
                  radius: 38,
                  backgroundColor: cs.primaryContainer,
                  child: Text(
                    inicial,
                    style: TextStyle(
                      fontSize: 26,
                      fontWeight: FontWeight.w800,
                      color: cs.onPrimaryContainer,
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  nombre,
                  style: const TextStyle(
                    fontSize: 21,
                    fontWeight: FontWeight.w800,
                    letterSpacing: -.5,
                  ),
                ),
                Text(email, style: TextStyle(fontSize: 13, color: cs.onSurfaceVariant)),
              ],
            ),
          ),
          const SizedBox(height: 28),
          const SectionLabel('Apariencia'),
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: cs.surfaceContainerLow,
              borderRadius: BorderRadius.circular(AppRadios.card),
            ),
            child: Consumer<ThemeModeViewModel>(
              builder: (context, modo, _) => SegmentedButton<int>(
                segments: const [
                  ButtonSegment(
                    value: 0,
                    icon: Icon(Icons.brightness_auto_rounded, size: 18),
                    label: Text('Sistema'),
                  ),
                  ButtonSegment(
                    value: 1,
                    icon: Icon(Icons.light_mode_rounded, size: 18),
                    label: Text('Claro'),
                  ),
                  ButtonSegment(
                    value: 2,
                    icon: Icon(Icons.dark_mode_rounded, size: 18),
                    label: Text('Oscuro'),
                  ),
                ],
                selected: {
                  switch (modo.mode) {
                    ThemeMode.system => 0,
                    ThemeMode.light => 1,
                    _ => 2,
                  },
                },
                onSelectionChanged: (sel) => modo.setMode(switch (sel.first) {
                  0 => ThemeMode.system,
                  1 => ThemeMode.light,
                  _ => ThemeMode.dark,
                }),
              ),
            ),
          ),
          const SizedBox(height: 24),
          const SectionLabel('Confianza'),
          const _TarjetaInfo(
            icono: Icons.verified_user_rounded,
            titulo: 'Compra protegida',
            cuerpo:
                'Solo mostramos agencias con RNT vigente y matrícula mercantil '
                'verificadas por el equipo Diverso. Si una agencia cambia sus datos o '
                'se le vence el RNT, sus planes se ocultan hasta revalidarla.',
          ),
          const SizedBox(height: 12),
          const _TarjetaInfo(
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
                  onTap: () => context.push('/legal/privacidad'),
                ),
                Divider(height: 1, indent: 56, color: cs.outlineVariant.withValues(alpha: .5)),
                ListTile(
                  leading: const Icon(Icons.description_outlined),
                  title: const Text('Términos y condiciones'),
                  subtitle: const Text('Versión $kVersionLegal'),
                  trailing: const Icon(Icons.chevron_right_rounded),
                  onTap: () => context.push('/legal/terminos-viajeros'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 28),
          OutlinedButton.icon(
            style: OutlinedButton.styleFrom(foregroundColor: cs.error),
            onPressed: () async {
              await _auth.signOut();
            },
            icon: const Icon(Icons.logout_rounded, size: 18),
            label: const Text('Cerrar sesión'),
          ),
        ],
      ),
    );
  }
}

class _TarjetaInfo extends StatelessWidget {
  const _TarjetaInfo({required this.icono, required this.titulo, required this.cuerpo});

  final IconData icono;
  final String titulo;
  final String cuerpo;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: cs.surfaceContainerLow,
        borderRadius: BorderRadius.circular(AppRadios.card),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(9),
            decoration: BoxDecoration(color: cs.primaryContainer, shape: BoxShape.circle),
            child: Icon(icono, size: 17, color: cs.onPrimaryContainer),
          ),
          const SizedBox(width: 13),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(titulo, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                const SizedBox(height: 4),
                Text(
                  cuerpo,
                  style: TextStyle(fontSize: 13, height: 1.5, color: cs.onSurfaceVariant),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
