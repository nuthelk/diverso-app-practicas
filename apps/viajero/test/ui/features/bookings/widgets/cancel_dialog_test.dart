import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:viajero/ui/features/bookings/widgets/cancel_dialog.dart';

VistaPreviaCancelacion _vista({
  required bool aplica,
  required int porcentaje,
  required double monto,
  String motivo = 'motivo del servidor',
}) => VistaPreviaCancelacion(
  aplica: aplica,
  porcentaje: porcentaje,
  monto: monto,
  horasAntes: 30,
  motivo: motivo,
);

Future<bool?> _abrir(WidgetTester tester, VistaPreviaCancelacion vista) async {
  bool? resultado;
  await tester.pumpWidget(
    MaterialApp(
      home: Builder(
        builder: (context) => Scaffold(
          body: TextButton(
            onPressed: () async => resultado = await showDialog<bool>(
              context: context,
              builder: (_) => CancelacionDialog(codigo: 'DIV-ABC123', vista: vista),
            ),
            child: const Text('abrir'),
          ),
        ),
      ),
    ),
  );
  await tester.tap(find.text('abrir'));
  await tester.pumpAndSettle();
  return resultado;
}

void main() {
  testWidgets('100 %: dice que se devuelve todo y que es de prueba', (tester) async {
    await _abrir(tester, _vista(aplica: true, porcentaje: 100, monto: 300000));
    expect(find.text('¿Cancelar reserva?'), findsOneWidget);
    expect(find.textContaining('DIV-ABC123'), findsOneWidget);
    expect(find.textContaining('te devolvemos el 100 % (\$ 300.000)'), findsOneWidget);
    expect(find.textContaining('reembolso de prueba'), findsOneWidget);
    expect(find.textContaining('no se mueve dinero real'), findsOneWidget);
  });

  testWidgets('50 %: muestra el porcentaje parcial y el monto', (tester) async {
    await _abrir(tester, _vista(aplica: true, porcentaje: 50, monto: 150000));
    expect(find.textContaining('te devolvemos el 50 % (\$ 150.000)'), findsOneWidget);
    expect(find.textContaining('política del plan'), findsOneWidget);
    expect(find.textContaining('100 %'), findsNothing);
  });

  testWidgets('0 %: avisa que no hay reembolso y cita el motivo del servidor', (tester) async {
    await _abrir(
      tester,
      _vista(
        aplica: false,
        porcentaje: 0,
        monto: 0,
        motivo: 'Cancelación con menos de 24 h de anticipación: sin reembolso',
      ),
    );
    expect(find.textContaining('no recibirás reembolso'), findsOneWidget);
    expect(
      find.textContaining('Cancelación con menos de 24 h de anticipación: sin reembolso'),
      findsOneWidget,
    );
    expect(find.textContaining('te devolvemos'), findsNothing);
  });

  testWidgets('«Sí, cancelar» confirma y «Mantener» no', (tester) async {
    bool? resultado;
    Future<void> abrir(String boton) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Builder(
            builder: (context) => Scaffold(
              body: TextButton(
                onPressed: () async => resultado = await showDialog<bool>(
                  context: context,
                  builder: (_) => CancelacionDialog(
                    codigo: 'DIV-1',
                    vista: _vista(aplica: true, porcentaje: 100, monto: 1000),
                  ),
                ),
                child: const Text('abrir'),
              ),
            ),
          ),
        ),
      );
      await tester.tap(find.text('abrir'));
      await tester.pumpAndSettle();
      await tester.tap(find.text(boton));
      await tester.pumpAndSettle();
    }

    await abrir('Mantener');
    expect(resultado, isFalse);
    await abrir('Sí, cancelar');
    expect(resultado, isTrue);
  });
}
