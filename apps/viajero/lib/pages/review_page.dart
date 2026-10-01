import 'package:flutter/material.dart';
import 'package:diverso_core/diverso_core.dart';

/// Reseña verificada: solo se llega desde una reserva propia ya viajada.
class ReviewPage extends StatefulWidget {
  const ReviewPage({super.key, required this.booking});

  final Booking booking;

  @override
  State<ReviewPage> createState() => _ReviewPageState();
}

class _ReviewPageState extends State<ReviewPage> {
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
    final nav = Navigator.of(context);
    try {
      await _servicio.crear(
        bookingId: widget.booking.id,
        calificacion: _calificacion,
        comentario: _comentarioCtrl.text,
      );
      msg.showSnackBar(
          const SnackBar(content: Text('¡Gracias! Tu reseña ayudará a otros viajeros.')));
      nav.pop(true);
    } on DiversoException catch (e) {
      msg.showSnackBar(SnackBar(content: Text(e.mensajeUsuario)));
      setState(() => _enviando = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final plan = widget.booking.plan;

    return Scaffold(
      appBar: AppBar(title: const Text('Tu reseña')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          if (plan != null) ...[
            Text(
              plan.titulo,
              style: Theme.of(context)
                  .textTheme
                  .titleLarge
                  ?.copyWith(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 4),
            Text(
              'Reserva ${widget.booking.codigo} · '
              '${widget.booking.planDate != null ? formatFechaLarga(widget.booking.planDate!.fecha) : ''}',
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
          const SizedBox(height: 24),
          const Text('¿Cómo estuvo tu experiencia?',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(5, (i) {
              final marcada = i < _calificacion;
              return IconButton(
                iconSize: 44,
                onPressed: _enviando ? null : () => setState(() => _calificacion = i + 1),
                icon: Icon(
                  marcada ? Icons.star : Icons.star_border,
                  color: marcada ? cs.primary : Colors.black26,
                ),
              );
            }),
          ),
          Center(
            child: Text(
              switch (_calificacion) {
                1 => 'Muy mala',
                2 => 'Mala',
                3 => 'Regular',
                4 => 'Buena',
                _ => '¡Excelente!',
              },
              style: TextStyle(color: cs.primary, fontWeight: FontWeight.w600),
            ),
          ),
          const SizedBox(height: 24),
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
          const SizedBox(height: 8),
          FilledButton.icon(
            style: FilledButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
            onPressed: _enviando ? null : _enviar,
            icon: _enviando
                ? const SizedBox(
                    height: 18,
                    width: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.send),
            label: const Text('Publicar reseña'),
          ),
          const SizedBox(height: 12),
          const Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.verified, size: 14, color: Colors.blueGrey),
              SizedBox(width: 5),
              Text('Reseña verificada: solo quien viajó puede opinar',
                  style: TextStyle(fontSize: 12, color: Colors.black45)),
            ],
          ),
        ],
      ),
    );
  }
}
