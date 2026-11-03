import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../router/app_routes.dart';
import '../../../core/theme/app_insets.dart';
import '../../../core/theme/app_text.dart';
import '../../../core/theme/diverso_colors.dart';
import '../view_models/review_view_model.dart';

/// Reseña verificada: solo se llega desde una reserva propia ya viajada (RLS lo garantiza en el
/// servidor). Recibe el [ReviewViewModel] con la reserva ya cargada (lo crea `ReviewLoader`).
class ReviewView extends StatefulWidget {
  const ReviewView({super.key, required this.viewModel});

  final ReviewViewModel viewModel;

  @override
  State<ReviewView> createState() => _ReviewViewState();
}

class _ReviewViewState extends State<ReviewView> {
  final _comentarioCtrl = TextEditingController();

  ReviewViewModel get _viewModel => widget.viewModel;

  @override
  void dispose() {
    _comentarioCtrl.dispose();
    super.dispose();
  }

  Future<void> _enviar() async {
    final msg = ScaffoldMessenger.of(context);
    final publicada = await _viewModel.enviar(_comentarioCtrl.text);
    if (publicada) {
      msg.showSnackBar(
        const SnackBar(content: Text('¡Gracias! Tu reseña ayudará a otros viajeros.')),
      );
      // Abierta directo (recarga en web) no hay pantalla anterior a la que volver.
      if (mounted) context.canPop() ? context.pop(true) : context.go(AppRoutes.reservas);
    } else if (_viewModel.errorEnvio case final motivo?) {
      msg.showSnackBar(SnackBar(content: Text(motivo)));
    }
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(listenable: _viewModel, builder: (context, _) => _formulario(context));
  }

  Widget _formulario(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final vm = _viewModel;
    final plan = vm.reserva?.plan;
    final fecha = vm.reserva?.planDate?.fecha;
    final bloqueado = vm.enviando || vm.publicada;

    return Scaffold(
      appBar: AppBar(title: const Text('Tu reseña')),
      body: Center(
        child: SingleChildScrollView(
          padding: AppInsets.pantalla,
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
                      fontSize: AppText.encabezadoM,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -.5,
                      height: 1.2,
                    ),
                  ),
                  if (fecha != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      formatFechaLarga(fecha),
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: AppText.detalle, color: cs.onSurfaceVariant),
                    ),
                  ],
                ],
                const SizedBox(height: 30),
                Text(
                  '¿Cómo estuvo tu experiencia?',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: AppText.subtitulo,
                    fontWeight: FontWeight.w700,
                    color: cs.onSurface,
                  ),
                ),
                const SizedBox(height: 18),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: List.generate(5, (i) {
                    final marcada = i < vm.calificacion;
                    return IconButton(
                      iconSize: 42,
                      padding: const EdgeInsets.symmetric(horizontal: 6),
                      tooltip: '${i + 1} de 5 estrellas',
                      onPressed: bloqueado ? null : () => vm.calificar(i + 1),
                      icon: Icon(
                        marcada ? Icons.star_rounded : Icons.star_outline_rounded,
                        color: marcada ? DiversoColors.of(context).dorado : cs.outline,
                      ),
                    );
                  }),
                ),
                Center(
                  child: AnimatedSwitcher(
                    duration: const Duration(milliseconds: 150),
                    child: Text(
                      switch (vm.calificacion) {
                        1 => 'Muy mala',
                        2 => 'Mala',
                        3 => 'Regular',
                        4 => 'Buena',
                        _ => '¡Excelente!',
                      },
                      key: ValueKey(vm.calificacion),
                      style: TextStyle(
                        color: cs.primary,
                        fontWeight: FontWeight.w700,
                        fontSize: AppText.enfasis,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 28),
                TextField(
                  controller: _comentarioCtrl,
                  maxLines: 5,
                  maxLength: 500,
                  enabled: !bloqueado,
                  decoration: const InputDecoration(
                    labelText: 'Cuenta cómo te fue (opcional)',
                    alignLabelWithHint: true,
                  ),
                ),
                const SizedBox(height: 18),
                FilledButton.icon(
                  onPressed: bloqueado ? null : _enviar,
                  icon: bloqueado
                      ? const SizedBox(
                          height: 17,
                          width: 17,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.send_rounded, size: 17),
                  label: const Text('Publicar reseña'),
                ),
                const SizedBox(height: 14),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.verified_rounded, size: 13, color: cs.tertiary),
                    const SizedBox(width: 5),
                    Flexible(
                      child: Text(
                        'Reseña verificada: solo quien viajó puede opinar',
                        style: TextStyle(fontSize: AppText.leyenda, color: cs.onSurfaceVariant),
                      ),
                    ),
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
