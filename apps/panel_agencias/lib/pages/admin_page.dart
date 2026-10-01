import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:diverso_core/diverso_core.dart';

import 'login_page.dart';

/// Vista de administración (rol admin): verificar agencias contra su RNT y
/// matrícula de Cámara de Comercio — el sello de confianza de Diverso.
class AdminPage extends StatefulWidget {
  const AdminPage({super.key, required this.onChanged});

  final VoidCallback onChanged;

  @override
  State<AdminPage> createState() => _AdminPageState();
}

class _AdminPageState extends State<AdminPage> {
  late Future<List<Map<String, dynamic>>> _future;

  SupabaseClient get _client => Supabase.instance.client;

  @override
  void initState() {
    super.initState();
    _cargar();
  }

  void _cargar() {
    setState(() {
      _future = _client
          .from('agencies')
          .select()
          .order('estado_verificacion')
          .order('created_at');
    });
  }

  Future<void> _refrescar() async {
    setState(() {
      _future = _client
          .from('agencies')
          .select()
          .order('estado_verificacion')
          .order('created_at');
    });
    await _future;
  }

  Future<void> _cambiarEstado(Map<String, dynamic> agencia, String estado) async {
    final msg = ScaffoldMessenger.of(context);
    try {
      // El trigger guard_agency_verification permite el cambio solo a admins.
      await _client
          .from('agencies')
          .update({'estado_verificacion': estado}).eq('id', agencia['id']);
      await _refrescar();
      msg.showSnackBar(SnackBar(
          content: Text(
              '${agencia['nombre']} → ${estado == 'verificado' ? 'verificada ✓' : 'rechazada'}')));
    } catch (e) {
      msg.showSnackBar(
          const SnackBar(content: Text('No se pudo actualizar la agencia.')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Diverso · Administración'),
        actions: [
          IconButton(
            tooltip: 'Cerrar sesión',
            icon: const Icon(Icons.logout),
            onPressed: () async {
              await AuthService().signOut();
              if (context.mounted) {
                Navigator.of(context).pushReplacement(
                  MaterialPageRoute(builder: (_) => const LoginPage()),
                );
              }
            },
          ),
        ],
      ),
      backgroundColor: cs.surfaceContainerLowest,
      body: FutureBuilder<List<Map<String, dynamic>>>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snap.hasError) {
            return Center(child: Text('Error: ${snap.error}'));
          }
          final agencias = snap.data ?? const [];
          final pendientes = agencias
              .where((a) => a['estado_verificacion'] == 'pendiente')
              .length;

          return ListView(
            padding: const EdgeInsets.all(20),
            children: [
              Text('Verificación de agencias',
                  style: Theme.of(context)
                      .textTheme
                      .headlineSmall
                      ?.copyWith(fontWeight: FontWeight.w800)),
              Text(
                '$pendientes en espera · valida el RNT en el registro del MinCIT '
                'y la matrícula en la Cámara de Comercio antes de aprobar.',
                style: const TextStyle(color: Colors.black54),
              ),
              const SizedBox(height: 16),
              ...agencias.map((a) {
                final estado = a['estado_verificacion'] as String;
                return Card(
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(a['nombre'] as String? ?? '',
                                  style: const TextStyle(
                                      fontWeight: FontWeight.w800, fontSize: 15)),
                            ),
                            _chip(estado),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'RNT ${a['numero_rnt']} · Matrícula ${a['matricula_camara_comercio']} · '
                          '${a['ciudad']} · ${a['telefono'] ?? ''} ${a['email'] ?? ''}',
                          style: const TextStyle(fontSize: 13, color: Colors.black54),
                        ),
                        if ((a['descripcion'] as String?)?.isNotEmpty == true)
                          Padding(
                            padding: const EdgeInsets.only(top: 4),
                            child: Text(a['descripcion'] as String,
                                style: const TextStyle(
                                    fontSize: 13, color: Colors.black45)),
                          ),
                        if (estado == 'pendiente') ...[
                          const Divider(height: 20),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.end,
                            children: [
                              OutlinedButton.icon(
                                style: OutlinedButton.styleFrom(
                                    foregroundColor: Colors.red.shade700),
                                icon: const Icon(Icons.close, size: 18),
                                label: const Text('Rechazar'),
                                onPressed: () => _cambiarEstado(a, 'rechazado'),
                              ),
                              const SizedBox(width: 8),
                              FilledButton.icon(
                                icon: const Icon(Icons.verified, size: 18),
                                label: const Text('Verificar'),
                                onPressed: () => _cambiarEstado(a, 'verificado'),
                              ),
                            ],
                          ),
                        ],
                      ],
                    ),
                  ),
                );
              }),
            ],
          );
        },
      ),
    );
  }

  Widget _chip(String estado) {
    final (color, texto) = switch (estado) {
      'verificado' => (Colors.green.shade700, 'Verificada'),
      'rechazado' => (Colors.red.shade700, 'Rechazada'),
      _ => (Colors.orange.shade800, 'Pendiente'),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: .12),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(texto,
          style: TextStyle(
              color: color, fontSize: 11, fontWeight: FontWeight.w700)),
    );
  }
}
