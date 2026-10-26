/// Widgets compartidos del sistema de diseño Diverso.
library;

import 'package:flutter/material.dart';
import 'package:diverso_core/diverso_core.dart';

/// Estrellas compactas + valor numérico opcional.
class RatingStars extends StatelessWidget {
  const RatingStars({super.key, required this.calificacion, this.size = 15, this.mostrarNumero = false});

  final double calificacion;
  final double size;
  final bool mostrarNumero;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(Icons.star_rounded, size: size + 2, color: const Color(0xFFE8A33D)),
        if (mostrarNumero)
          Text(
            calificacion.toStringAsFixed(1),
            style: TextStyle(fontSize: size - 1, fontWeight: FontWeight.w700, color: cs.onSurface),
          ),
      ],
    );
  }
}

/// Calificación de una reseña: cinco estrellas, llenas hasta [calificacion] (1 a 5). A diferencia de
/// [RatingStars] (resumen «★ 4.8»), aquí la cantidad de estrellas ES el dato.
class EstrellasCalificacion extends StatelessWidget {
  const EstrellasCalificacion({super.key, required this.calificacion, this.size = 15});

  final int calificacion;
  final double size;

  @override
  Widget build(BuildContext context) {
    const dorado = Color(0xFFE8A33D);
    final vacia = Theme.of(context).colorScheme.outlineVariant;
    return Semantics(
      label: '$calificacion de 5 estrellas',
      excludeSemantics: true,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          for (var i = 1; i <= 5; i++)
            i <= calificacion
                ? Icon(Icons.star_rounded, size: size, color: dorado)
                : Icon(Icons.star_outline_rounded, size: size, color: vacia),
        ],
      ),
    );
  }
}

/// Puntaje de un plan: ★ con su valor y la cantidad de reseñas, o «Nueva» mientras no tenga
/// ninguna (un 0.0 sería engañoso). [detallado] escribe «· n reseñas verificadas» (ficha del plan)
/// en vez de «(n)» (tarjeta).
class PuntajePlan extends StatelessWidget {
  const PuntajePlan({super.key, required this.plan, this.detallado = false});

  final Plan plan;
  final bool detallado;

  @override
  Widget build(BuildContext context) {
    if (plan.esNuevo) return const InsigniaNueva();
    final suave = TextStyle(
      fontSize: detallado ? 13 : 12,
      color: Theme.of(context).colorScheme.onSurfaceVariant,
    );
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        RatingStars(calificacion: plan.ratingPromedio, mostrarNumero: true),
        if (detallado)
          Text(' · ${plan.reviewsCount} reseñas verificadas', style: suave)
        else ...[
          const SizedBox(width: 3),
          Text('(${plan.reviewsCount})', style: suave),
        ],
      ],
    );
  }
}

/// Píldora «Nueva» de lo que aún no tiene reseñas (planes y agencias).
class InsigniaNueva extends StatelessWidget {
  const InsigniaNueva({super.key, this.texto = 'Nueva'});

  final String texto;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: cs.primary.withValues(alpha: .10),
        borderRadius: BorderRadius.circular(AppRadios.pill),
      ),
      child: Text(
        texto,
        style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: cs.primary),
      ),
    );
  }
}

/// Título de página compartido (Explorar, Agencias, Reservas, Perfil): grande y en negrita.
class TituloPagina extends StatelessWidget {
  const TituloPagina(this.texto, {super.key});

  final String texto;

  static TextStyle estilo(ColorScheme cs) => TextStyle(
        fontSize: 28,
        fontWeight: FontWeight.w800,
        letterSpacing: -1,
        height: 1.1,
        color: cs.onSurface,
      );

  @override
  Widget build(BuildContext context) {
    return Text(
      texto,
      maxLines: 1,
      overflow: TextOverflow.ellipsis,
      style: estilo(Theme.of(context).colorScheme),
    );
  }
}

/// Cabecera colapsable con foto (detalle del plan, página de la agencia): con la foto a la vista
/// el botón de volver flota sobre ella; al desplazarse termina SÓLIDA, del color de la página, con
/// [titulo] y el botón de volver, de modo que nada se dibuja debajo de la barra de estado.
class CabeceraColapsable extends StatelessWidget {
  const CabeceraColapsable({
    super.key,
    required this.titulo,
    required this.fondo,
    required this.onVolver,
    this.alturaExpandida = 260,
  });

  final String titulo;
  final Widget fondo;
  final VoidCallback onVolver;
  final double alturaExpandida;

  @override
  Widget build(BuildContext context) {
    return SliverAppBar(
      pinned: true,
      expandedHeight: alturaExpandida,
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      surfaceTintColor: Colors.transparent,
      leading: Padding(
        padding: const EdgeInsets.all(8),
        child: IconButton.filled(
          style: IconButton.styleFrom(
            backgroundColor: Colors.black.withValues(alpha: .45),
            foregroundColor: Colors.white,
          ),
          tooltip: 'Volver',
          icon: const Icon(Icons.arrow_back_rounded, size: 20),
          onPressed: onVolver,
        ),
      ),
      flexibleSpace: Stack(
        fit: StackFit.expand,
        children: [
          FlexibleSpaceBar(background: fondo),
          _FondoSolido(titulo: titulo),
        ],
      ),
    );
  }
}

/// Capa que aparece (fundido) sobre la foto cuando la cabecera está casi colapsada.
class _FondoSolido extends StatelessWidget {
  const _FondoSolido({required this.titulo});

  final String titulo;

  @override
  Widget build(BuildContext context) {
    final ajustes = context.dependOnInheritedWidgetOfExactType<FlexibleSpaceBarSettings>();
    if (ajustes == null) return const SizedBox.shrink();
    final rango = ajustes.maxExtent - ajustes.minExtent;
    final colapso =
        rango <= 0 ? 1.0 : (1 - (ajustes.currentExtent - ajustes.minExtent) / rango).clamp(0.0, 1.0);
    final solido = ((colapso - .6) / .4).clamp(0.0, 1.0);
    if (solido == 0) return const SizedBox.shrink();
    final tema = Theme.of(context);
    return Opacity(
      opacity: solido,
      child: Stack(
        children: [
          Positioned.fill(child: ColoredBox(color: tema.scaffoldBackgroundColor)),
          Positioned(
            left: 64,
            right: 20,
            top: MediaQuery.paddingOf(context).top,
            height: kToolbarHeight,
            child: Align(
              alignment: Alignment.centerLeft,
              child: Text(
                titulo,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 19,
                  fontWeight: FontWeight.w800,
                  letterSpacing: -.4,
                  color: tema.colorScheme.onSurface,
                ),
              ),
            ),
          ),
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: Divider(height: 1, color: tema.colorScheme.outlineVariant),
          ),
        ],
      ),
    );
  }
}

/// Sello de confianza: agencia verificada (RNT + Cámara de Comercio). [blanco] es la versión para
/// ir sobre una foto: fondo oscuro casi opaco con texto blanco, legible sobre cualquier imagen.
class VerifiedBadge extends StatelessWidget {
  const VerifiedBadge({super.key, this.compacto = false, this.blanco = false});

  final bool compacto;
  final bool blanco;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final fg = blanco ? Colors.white : cs.primary;
    final bg = blanco ? Colors.black.withValues(alpha: .66) : cs.primary.withValues(alpha: .10);
    return Container(
      padding: EdgeInsets.symmetric(horizontal: compacto ? 7 : 10, vertical: compacto ? 2.5 : 5),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(AppRadios.pill)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.verified_rounded, size: compacto ? 13 : 15, color: fg),
          const SizedBox(width: 4),
          Text(
            'Verificada RNT',
            style: TextStyle(
              fontSize: compacto ? 10.5 : 11,
              fontWeight: FontWeight.w700,
              color: fg,
            ),
          ),
        ],
      ),
    );
  }
}

/// Precio protagonista: monto grande + unidad discreta.
class PriceText extends StatelessWidget {
  const PriceText({super.key, required this.monto, this.alineado = CrossAxisAlignment.start});

  final double monto;
  final CrossAxisAlignment alineado;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Column(
      crossAxisAlignment: alineado,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          formatCOP(monto),
          style: TextStyle(
            fontSize: 21,
            fontWeight: FontWeight.w800,
            letterSpacing: -.5,
            color: cs.onSurface,
          ),
        ),
        Text('por persona · precio final',
            style: TextStyle(fontSize: 10.5, color: cs.onSurfaceVariant)),
      ],
    );
  }
}

/// Estado vacío o de error: icono, título, mensaje y acción opcional.
class EmptyState extends StatelessWidget {
  const EmptyState({
    super.key,
    required this.icono,
    required this.titulo,
    required this.mensaje,
    this.detalle,
    this.accion,
  });

  final IconData icono;
  final String titulo;
  final String mensaje;

  /// Causa técnica opcional (excepción cruda) mostrada en pequeño para
  /// poder diagnosticar errores de backend sin depurar.
  final String? detalle;
  final Widget? accion;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(36),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: cs.surfaceContainerHigh,
                shape: BoxShape.circle,
              ),
              child: Icon(icono, size: 30, color: cs.onSurfaceVariant),
            ),
            const SizedBox(height: 16),
            Text(titulo,
                style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700, letterSpacing: -.3)),
            const SizedBox(height: 5),
            ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 300),
              child: Text(
                mensaje,
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 13.5, height: 1.45, color: cs.onSurfaceVariant),
              ),
            ),
            if (detalle != null) ...[
              const SizedBox(height: 8),
              ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 340),
                child: Text(
                  detalle!,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 11,
                    fontFamily: 'monospace',
                    height: 1.35,
                    color: cs.onSurfaceVariant.withValues(alpha: .75),
                  ),
                ),
              ),
            ],
            if (accion != null) ...[const SizedBox(height: 18), accion!],
          ],
        ),
      ),
    );
  }
}

/// Placeholder con pulso para estados de carga (skeleton minimalista).
class Skeleton extends StatefulWidget {
  const Skeleton({super.key, this.width, this.height = 16, this.radius = 10});

  final double? width;
  final double height;
  final double radius;

  @override
  State<Skeleton> createState() => _SkeletonState();
}

class _SkeletonState extends State<Skeleton> with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl =
      AnimationController(vsync: this, duration: const Duration(milliseconds: 1100))..repeat(reverse: true);

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final base = Theme.of(context).colorScheme.surfaceContainerHigh;
    return FadeTransition(
      opacity: Tween(begin: .45, end: 1.0).animate(CurvedAnimation(parent: _ctrl, curve: Curves.easeInOut)),
      child: Container(
        width: widget.width,
        height: widget.height,
        decoration: BoxDecoration(color: base, borderRadius: BorderRadius.circular(widget.radius)),
      ),
    );
  }
}

/// Política de cancelación del plan (Anexo 5), en una tarjeta tintada.
class TarjetaCancelacion extends StatelessWidget {
  const TarjetaCancelacion({super.key, required this.texto});

  final String texto;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: cs.tertiaryContainer.withValues(alpha: .45),
        borderRadius: BorderRadius.circular(AppRadios.card),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.shield_outlined, size: 19, color: cs.onTertiaryContainer),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Política de cancelación',
                    style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5)),
                const SizedBox(height: 3),
                Text(
                  texto,
                  style: TextStyle(
                    fontSize: 13,
                    height: 1.45,
                    color: cs.onSurface.withValues(alpha: .8),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Un paso del itinerario: hora a la izquierda y la actividad en una línea de tiempo.
class PasoItinerario extends StatelessWidget {
  const PasoItinerario({super.key, required this.paso});

  final ItinerarioPaso paso;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SizedBox(
            width: 62,
            child: Text(
              paso.hora,
              textAlign: TextAlign.right,
              style: TextStyle(
                fontWeight: FontWeight.w800,
                fontSize: 13,
                color: cs.primary,
                height: 1.35,
              ),
            ),
          ),
          const SizedBox(width: 14),
          Column(
            children: [
              Container(
                margin: const EdgeInsets.only(top: 4),
                width: 8,
                height: 8,
                decoration: BoxDecoration(color: cs.primary, shape: BoxShape.circle),
              ),
              Expanded(child: Container(width: 1.6, color: cs.outlineVariant)),
            ],
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: Text(
                paso.actividad,
                style: const TextStyle(height: 1.45, fontSize: 14),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Radios del sistema de diseño (acceso corto desde widgets).
abstract final class AppRadios {
  static const double field = 14;
  static const double card = 20;
  static const double sheet = 28;
  static const double pill = 999;
}
