import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:diverso_core/diverso_core.dart';

import '../../core/widgets.dart';

/// Vista de administración: verificar agencias contra RNT y Cámara de
/// Comercio — el sello de confianza de Diverso (Anexo 4).
class AdminView extends StatefulWidget {
  const AdminView({super.key});

  @override
  State<AdminView> createState() => _AdminViewState();
}

class _AdminViewState extends State<AdminView> {
  final _client = Supabase.instance.client;
  late Future<List<Map<String, dynamic>>> _future;

  @override
  void initState() {
    super.initState();
    _cargar();
  }

  void _cargar() {
    _future = _client
        .from('agencies')
        .select()
        .order('estado_verificacion')
        .order('created_at');
  }

  Future<void> _refrescar() async {
    setState(_cargar);
    await _future;
  }

  Future<void> _cambiarEstado(Map<String, dynamic> agencia, String estado) async {
    final msg = ScaffoldMessenger.of(context);
    try {
      // El trigger guard_agency_verification permite el cambio solo a admins.
      await _client.from('agencies').update({'estado_verificacion': estado}).eq('id', agencia['id']);
      await _refrescar();
      msg.showSnackBar(SnackBar(
        content: Text(
            '${agencia['nombre']} → ${estado == 'verificado' ? 'verificada ✓' : 'rechazada'}'),
      ));
    } catch (_) {
      msg.showSnackBar(const SnackBar(content: Text('No se pudo actualizar la agencia.')));
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
            icon: const Icon(Icons.logout_rounded),
            onPressed: () async {
              await AuthService().signOut();
              if (context.mounted) context.go('/login');
            },
          ),
        ],
      ),
      body: FutureBuilder<List<Map<String, dynamic>>>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState != ConnectionState.done) {
            return ListView(
              padding: const EdgeInsets.all(28),
              children: List.generate(
                4,
                (_) => const Padding(
                  padding: EdgeInsets.only(bottom: 12),
                  child: Skeleton(height: 110, radius: 20),
                ),
              ),
            );
          }
          if (snap.hasError) {
            return EmptyState(
              icono: Icons.cloud_off_rounded,
              titulo: 'Error',
              mensaje: 'No pudimos cargar las agencias (${snap.error}).',
            );
          }
          final agencias = snap.data ?? const [];
          final pendientes =
              agencias.where((a) => a['estado_verificacion'] == 'pendiente').length;

          return ListView(
            padding: const EdgeInsets.all(28),
            children: [
              Text(
                'Verificación de agencias',
                style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w800, letterSpacing: -.8),
              ),
              const SizedBox(height: 4),
              Text(
                '$pendientes en espera · valida el RNT en el registro del MinCIT y la '
                'matrícula en la Cámara de Comercio antes de aprobar.',
                style: TextStyle(fontSize: 13.5, color: cs.onSurfaceVariant),
              ),
              const SizedBox(height: 20),
              ...agencias.map((a) {
                final estado = a['estado_verificacion'] as String;
                return Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Container(
                    padding: const EdgeInsets.all(18),
                    decoration: BoxDecoration(
                      color: cs.surfaceContainerLow,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            InitialsAvatar(a['nombre'] as String? ?? '', radius: 17),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                a['nombre'] as String? ?? '',
                                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
                              ),
                            ),
                            StatusPill.estado(estado),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Text(
                          'RNT ${a['numero_rnt']} · Matrícula ${a['matricula_camara_comercio']} · '
                          '${a['ciudad']}',
                          style: TextStyle(fontSize: 12.5, color: cs.onSurfaceVariant),
                        ),
                        if ((a['telefono'] as String?)?.isNotEmpty == true ||
                            (a['email'] as String?)?.isNotEmpty == true)
                          Text(
                            '${a['telefono'] ?? ''} ${a['email'] ?? ''}',
                            style: TextStyle(fontSize: 12, color: cs.onSurfaceVariant),
                          ),
                        if ((a['descripcion'] as String?)?.isNotEmpty == true)
                          Padding(
                            padding: const EdgeInsets.only(top: 4),
                            child: Text(
                              a['descripcion'] as String,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(fontSize: 12.5, color: cs.outline),
                            ),
                          ),
                        if (estado == 'pendiente') ...[
                          const Divider(height: 24),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.end,
                            children: [
                              OutlinedButton.icon(
                                style: OutlinedButton.styleFrom(
                                  minimumSize: const Size(0, 40),
                                  foregroundColor: cs.error,
                                ),
                                icon: const Icon(Icons.close_rounded, size: 17),
                                label: const Text('Rechazar'),
                                onPressed: () => _cambiarEstado(a, 'rechazado'),
                              ),
                              const SizedBox(width: 10),
                              FilledButton.icon(
                                style: FilledButton.styleFrom(minimumSize: const Size(0, 40)),
                                icon: const Icon(Icons.verified_rounded, size: 17),
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
}
