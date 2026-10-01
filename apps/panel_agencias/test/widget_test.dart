import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:panel_agencias/pages/login_page.dart';

void main() {
  testWidgets('Login del panel muestra accesos demo', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: LoginPage()));
    expect(find.text('Diverso · Panel de Agencias'), findsOneWidget);
    expect(find.text('Agencia demo'), findsOneWidget);
    expect(find.text('Admin'), findsOneWidget);
    expect(find.byType(TextFormField), findsNWidgets(2));
  });
}
