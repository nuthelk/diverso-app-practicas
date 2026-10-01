import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'pages/home_shell.dart';
import 'pages/login_page.dart';

class DiversoApp extends StatelessWidget {
  const DiversoApp({super.key});

  @override
  Widget build(BuildContext context) {
    const seed = Color(0xFF2E7D5B); // verde montaña antioqueña
    final scheme = ColorScheme.fromSeed(seedColor: seed);

    return MaterialApp(
      title: 'Diverso App',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: scheme,
        useMaterial3: true,
        appBarTheme: const AppBarTheme(centerTitle: false),
        inputDecorationTheme: InputDecorationTheme(
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
          filled: true,
        ),
        cardTheme: const CardThemeData(margin: EdgeInsets.zero),
        snackBarTheme: const SnackBarThemeData(behavior: SnackBarBehavior.floating),
      ),
      home: StreamBuilder<AuthState>(
        stream: Supabase.instance.client.auth.onAuthStateChange,
        builder: (context, snap) {
          final logged = snap.hasData && snap.data?.session != null;
          return logged ? const HomeShell() : const LoginPage();
        },
      ),
    );
  }
}
