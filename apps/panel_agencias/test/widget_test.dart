import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:panel_agencias/ui/core/widgets.dart';
import 'package:panel_agencias/ui/features/auth/login_view.dart';

void main() {
  testWidgets('Login del panel muestra accesos demo', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: LoginView()));
    expect(find.text('Diverso · Agencias'), findsOneWidget);
    expect(find.text('Agencia verificada'), findsOneWidget);
    expect(find.text('Admin'), findsOneWidget);
    expect(find.byType(TextFormField), findsNWidgets(2));
  });

  testWidgets('StatusPill mapea estados conocidos', (tester) async {
    await tester.pumpWidget(
      MaterialApp(home: Scaffold(body: StatusPill.estado('verificado'))),
    );
    expect(find.text('Verificada'), findsOneWidget);
  });
}
