import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';

/// Colores de marca para el círculo de iniciales (todos con buen contraste con texto blanco).
const _paleta = <Color>[
  Color(0xFF0E6E4F), // verde selva
  Color(0xFF2D4A73), // azul pizarra
  Color(0xFF7A4A21), // tierra
  Color(0xFF6B3A5B), // ciruela
  Color(0xFF1F6F7A), // lago
  Color(0xFF8A4B14), // cobre
  Color(0xFF4A6A2A), // musgo
  Color(0xFF4F4A8A), // añil
];

/// Color estable de una agencia: el mismo [clave] da siempre el mismo color (FNV-1a; `hashCode`
/// no es estable entre ejecuciones).
Color colorDeAgencia(String clave) {
  var h = 0x811c9dc5;
  for (final unidad in clave.codeUnits) {
    h = ((h ^ unidad) * 0x01000193) & 0xFFFFFFFF;
  }
  return _paleta[h % _paleta.length];
}

/// Logo de la agencia; mientras no suba uno (o si falla la carga), sus iniciales en un círculo de
/// color.
class AgencyAvatar extends StatelessWidget {
  const AgencyAvatar({super.key, required this.agencia, this.size = 46});

  final AgenciaResumen agencia;
  final double size;

  @override
  Widget build(BuildContext context) {
    final fallback = _Iniciales(agencia: agencia, size: size);
    final logo = agencia.logoUrl;
    return SizedBox.square(
      dimension: size,
      child: ClipOval(
        child: logo == null || logo.isEmpty
            ? fallback
            : Image.network(
                logo,
                fit: BoxFit.cover,
                gaplessPlayback: true,
                errorBuilder: (_, _, _) => fallback,
              ),
      ),
    );
  }
}

class _Iniciales extends StatelessWidget {
  const _Iniciales({required this.agencia, required this.size});

  final AgenciaResumen agencia;
  final double size;

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: colorDeAgencia(agencia.id),
      child: Center(
        child: Text(
          agencia.iniciales,
          style: TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.w800,
            fontSize: size * .38,
            letterSpacing: .5,
          ),
        ),
      ),
    );
  }
}
