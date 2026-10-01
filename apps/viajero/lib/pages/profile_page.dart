import 'package:flutter/material.dart';
import 'package:diverso_core/diverso_core.dart';

import 'login_page.dart';

class ProfilePage extends StatefulWidget {
  const ProfilePage({super.key});

  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  final _auth = AuthService();
  Profile? _perfil;

  @override
  void initState() {
    super.initState();
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
    final email = _auth.currentUserEmail ?? '';
    final inicial = (_perfil?.nombre.isNotEmpty == true ? _perfil!.nombre : email)
        .substring(0, 1)
        .toUpperCase();

    return Scaffold(
      appBar: AppBar(title: const Text('Perfil')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Center(
            child: CircleAvatar(
              radius: 40,
              child: Text(inicial, style: const TextStyle(fontSize: 30)),
            ),
          ),
          const SizedBox(height: 12),
          Center(
            child: Text(
              _perfil?.nombre ?? 'Viajero',
              style: Theme.of(context)
                  .textTheme
                  .titleLarge
                  ?.copyWith(fontWeight: FontWeight.w800),
            ),
          ),
          Center(child: Text(email, style: const TextStyle(color: Colors.black54))),
          const SizedBox(height: 24),
          const Card(
            child: Padding(
              padding: EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.verified_user_outlined, size: 18),
                      SizedBox(width: 8),
                      Text('Compra protegida',
                          style: TextStyle(fontWeight: FontWeight.w700)),
                    ],
                  ),
                  SizedBox(height: 6),
                  Text(
                    'Todas las agencias de Diverso están verificadas con RNT y '
                    'Cámara de Comercio. Tus pagos quedan protegidos con garantía '
                    'de reembolso según la política de cada plan.',
                    style: TextStyle(height: 1.35, color: Colors.black54),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          const Card(
            child: Padding(
              padding: EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.privacy_tip_outlined, size: 18),
                      SizedBox(width: 8),
                      Text('Tus datos',
                          style: TextStyle(fontWeight: FontWeight.w700)),
                    ],
                  ),
                  SizedBox(height: 6),
                  Text(
                    'Tratamos tus datos personales conforme a la Ley 1581 de 2012 '
                    '(Habeas Data), únicamente para gestionar tu cuenta y tus '
                    'reservas. Puedes solicitar su eliminación escribiéndonos.',
                    style: TextStyle(height: 1.35, color: Colors.black54),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),
          OutlinedButton.icon(
            style: OutlinedButton.styleFrom(
              foregroundColor: Theme.of(context).colorScheme.error,
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
            onPressed: () async {
              await _auth.signOut();
              if (context.mounted) {
                Navigator.of(context).pushReplacement(
                  MaterialPageRoute(builder: (_) => const LoginPage()),
                );
              }
            },
            icon: const Icon(Icons.logout),
            label: const Text('Cerrar sesión'),
          ),
        ],
      ),
    );
  }
}
