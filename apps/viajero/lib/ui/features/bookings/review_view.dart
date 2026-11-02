import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// Reseña verificada: solo se llega desde una reserva propia ya viajada
/// (RLS lo garantiza en el servidor).
class ReviewView extends StatefulWidget {
  const ReviewView({super.key, required this.booking});

  final Booking booking;

  @override
  State<ReviewView> createState() => _ReviewViewState();
}

class _ReviewViewState extends State<ReviewView> {
  final _comentarioCtrl = TextEditingController();
  final _servicio = ReviewService();
  int _calificacion = 5;
  bool _enviando = false;

  @override
  void dispose() {
    _comentarioCtrl.dispose();
    super.dispose();
  }

  Future<void> _enviar() async {
    setState(() => _enviando = true);
    final msg = ScaffoldMessenger.of(context);
    try {
      await _servicio.crear(
        bookingId: widget.booking.id,
        calificacion: _calificacion,
        comentario: _comentarioCtrl.text,
      );
      msg.showSnackBar(
          const SnackBar(content: Text('¡Gracias! Tu reseña ayudará a otros viajeros.')));
      if (mounted) context.pop(true);
    } on DiversoException catch (e) {
      msg.showSnackBar(SnackBar(content: Text(e.mensajeUsuario)));
      if (mounted) setState(() => _enviando = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final plan = widget.booking.plan;
    final fecha = widget.booking.planDate?.fecha;

    return Scaffold(
      appBar: AppBar(title: const Text('Tu reseña')),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 460),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (plan != null) ...[
                  Text(
                    plan.titulo,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                        fontSize: 21, fontWeight: FontWeight.w800, letterSpacing: -.5, height: 1.2),
                  ),
                  if (fecha != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      formatFechaLarga(fecha),
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 13, color: cs.onSurfaceVariant),
                    ),
                  ],
                ],
                const SizedBox(height: 30),
                Text(
                  '¿Cómo estuvo tu experiencia?',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: cs.onSurface),
                ),
                const SizedBox(height: 18),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: List.generate(5, (i) {
                    final marcada = i < _calificacion;
                    return IconButton(
                      iconSize: 42,
                      padding: const EdgeInsets.symmetric(horizontal: 6),
                      tooltip: '${i + 1} de 5 estrellas',
                      onPressed: _enviando ? null : () => setState(() => _calificacion = i + 1),
                      icon: Icon(
                        marcada ? Icons.star_rounded : Icons.star_outline_rounded,
                        color: marcada ? const Color(0xFFE8A33D) : cs.outline,
                      ),
                    );
                  }),
                ),
                Center(
                  child: AnimatedSwitcher(
                    duration: const Duration(milliseconds: 150),
                    child: Text(
                      switch (_calificacion) {
                        1 => 'Muy mala',
                        2 => 'Mala',
                        3 => 'Regular',
                        4 => 'Buena',
                        _ => '¡Excelente!',
                      },
                      key: ValueKey(_calificacion),
                      style: TextStyle(
                        color: cs.primary,
                        fontWeight: FontWeight.w700,
                        fontSize: 15,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 28),
                TextField(
                  controller: _comentarioCtrl,
                  maxLines: 5,
                  maxLength: 500,
                  enabled: !_enviando,
                  decoration: const InputDecoration(
                    labelText: 'Cuenta cómo te fue (opcional)',
                    alignLabelWithHint: true,
                  ),
                ),
                const SizedBox(height: 18),
                FilledButton.icon(
                  onPressed: _enviando ? null : _enviar,
                  icon: _enviando
                      ? const SizedBox(
                          height: 17, width: 17, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Icon(Icons.send_rounded, size: 17),
                  label: const Text('Publicar reseña'),
                ),
                const SizedBox(height: 14),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.verified_rounded, size: 13, color: cs.tertiary),
                    const SizedBox(width: 5),
                    Text('Reseña verificada: solo quien viajó puede opinar',
                        style: TextStyle(fontSize: 12, color: cs.onSurfaceVariant)),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
