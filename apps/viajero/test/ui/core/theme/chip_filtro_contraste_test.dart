import 'dart:math' as math;
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:viajero/ui/core/theme/app_theme.dart';

/// Bug U: el chip de filtro activo del catálogo (`InputChip`) casi no se leía (verde claro sobre
/// verde claro). Se mide lo que se PINTA, no lo que dice el tema: el color real del texto y del ícono
/// de borrar contra el fondo real del chip, con el mínimo AA de WCAG (4.5:1).
const _minimoAA = 4.5;

double _luminancia(Color c) {
  double canal(double v) =>
      v <= 0.03928 ? v / 12.92 : math.pow((v + 0.055) / 1.055, 2.4).toDouble();
  return 0.2126 * canal(c.r) + 0.7152 * canal(c.g) + 0.0722 * canal(c.b);
}

double _contraste(Color a, Color b) {
  final la = _luminancia(a);
  final lb = _luminancia(b);
  return (math.max(la, lb) + 0.05) / (math.min(la, lb) + 0.05);
}

double _distancia(Color a, Color b) =>
    math.pow(a.r - b.r, 2) + math.pow(a.g - b.g, 2) + math.pow(a.b - b.b, 2).toDouble();

class _Captura {
  _Captura(this.imagen, this.bytes);
  final ui.Image imagen;
  final ByteData bytes;

  Color pixel(int x, int y) {
    final o = (y * imagen.width + x) * 4;
    return Color.fromARGB(
      bytes.getUint8(o + 3),
      bytes.getUint8(o),
      bytes.getUint8(o + 1),
      bytes.getUint8(o + 2),
    );
  }

  /// El color de [zona] que más se aleja de [fondo]: el trazo del texto o del ícono sin suavizar.
  Color trazo(Rect zona, Color fondo) {
    var mejor = fondo;
    for (var y = zona.top.floor(); y < zona.bottom.ceil(); y++) {
      for (var x = zona.left.floor(); x < zona.right.ceil(); x++) {
        final c = pixel(x, y);
        if (_distancia(c, fondo) > _distancia(mejor, fondo)) mejor = c;
      }
    }
    return mejor;
  }
}

Future<void> _verChip(WidgetTester tester, ThemeData tema, GlobalKey captura) async {
  await tester.pumpWidget(
    RepaintBoundary(
      key: captura,
      child: MaterialApp(
        debugShowCheckedModeBanner: false,
        theme: tema,
        home: Scaffold(
          body: Wrap(
            children: [
              InputChip(
                avatar: const Icon(Icons.location_on_outlined, size: 15),
                label: const Text('Guatapé'),
                onDeleted: () {},
              ),
            ],
          ),
        ),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

Future<_Captura> _capturar(WidgetTester tester, GlobalKey captura) async {
  final limite = tester.renderObject<RenderRepaintBoundary>(find.byKey(captura));
  return (await tester.runAsync(() async {
    final imagen = await limite.toImage();
    final bytes = (await imagen.toByteData())!;
    return _Captura(imagen, bytes);
  }))!;
}

void main() {
  for (final (nombre, tema) in [
    ('claro', AppTheme.viajeroLight()),
    ('oscuro', AppTheme.viajeroDark()),
  ]) {
    testWidgets('chip de filtro activo ($nombre): texto e ícono de borrar con contraste AA', (
      tester,
    ) async {
      final captura = GlobalKey();
      await _verChip(tester, tema, captura);
      final foto = await _capturar(tester, captura);

      final chip = tester.getRect(find.byType(InputChip));
      // Fondo: un punto del chip sin texto ni íconos (el borde izquierdo, ya dentro de la píldora).
      final fondo = foto.pixel((chip.left + 14).round(), chip.center.dy.round());
      final texto = foto.trazo(tester.getRect(find.text('Guatapé')), fondo);
      final borrar = foto.trazo(tester.getRect(find.byIcon(Icons.clear)), fondo);

      final contrasteTexto = _contraste(texto, fondo);
      final contrasteIcono = _contraste(borrar, fondo);
      // ignore: avoid_print
      print(
        '[$nombre] fondo $fondo | texto ${contrasteTexto.toStringAsFixed(2)}:1 ($texto) '
        '| ícono ${contrasteIcono.toStringAsFixed(2)}:1 ($borrar)',
      );
      expect(contrasteTexto, greaterThanOrEqualTo(_minimoAA), reason: 'texto $texto sobre $fondo');
      expect(contrasteIcono, greaterThanOrEqualTo(_minimoAA), reason: 'ícono $borrar sobre $fondo');
    });
  }
}
