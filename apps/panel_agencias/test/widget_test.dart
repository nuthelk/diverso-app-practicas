import 'package:diverso_core/diverso_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:panel_agencias/ui/core/widgets.dart';
import 'package:panel_agencias/ui/features/auth/login_view.dart';
import 'package:provider/provider.dart';

class _Auth implements AuthRepository {
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void main() {
  testWidgets('Login del panel muestra accesos demo', (tester) async {
    await tester.pumpWidget(
      Provider<AuthRepository>.value(
        value: _Auth(),
        child: const MaterialApp(home: LoginView()),
      ),
    );
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
