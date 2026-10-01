import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'pages/login_page.dart';
import 'pages/root_page.dart';

class PanelAgenciasApp extends StatelessWidget {
  const PanelAgenciasApp({super.key});

  @override
  Widget build(BuildContext context) {
    const seed = Color(0xFF1F5C8B); // azul confianza (lado B2B)
    final scheme = ColorScheme.fromSeed(seedColor: seed);

    return MaterialApp(
      title: 'Diverso — Panel de Agencias',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: scheme,
        useMaterial3: true,
        inputDecorationTheme: InputDecorationTheme(
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
          filled: true,
        ),
        cardTheme: const CardThemeData(margin: EdgeInsets.zero),
        snackBarTheme: const SnackBarThemeData(behavior: SnackBarBehavior.floating),
      ),
      home: StreamBuilder<AuthState>(
        stream: Supabase.instance.client.auth.onAuthStateChange,
        builder: (context, snap) {
          final logged = snap.hasData && snap.data?.session != null;
          return logged ? const RootPage() : const LoginPage();
        },
      ),
    );
  }
}
