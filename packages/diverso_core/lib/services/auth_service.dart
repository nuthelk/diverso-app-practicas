import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/profile.dart';

class AuthService {
  SupabaseClient get _client => Supabase.instance.client;

  /// Inicia sesión con email y contraseña.
  Future<void> signIn({required String email, required String password}) async {
    await _client.auth.signInWithPassword(email: email, password: password);
  }

  /// Registra un viajero nuevo. El trigger handle_new_user crea su perfil.
  Future<void> signUpViajero({
    required String nombre,
    required String email,
    required String password,
  }) async {
    await _client.auth.signUp(
      email: email,
      password: password,
      data: {'nombre': nombre, 'rol': 'viajero'},
    );
  }

  Future<void> signOut() => _client.auth.signOut();

  Stream<String?> get onAuthStateChanged =>
      _client.auth.onAuthStateChange.map((s) => s.session?.user.id);

  String? get currentUserId => _client.auth.currentUser?.id;

  String? get currentUserEmail => _client.auth.currentUser?.email;

  Future<Profile> currentProfile() async {
    final uid = currentUserId;
    if (uid == null) throw StateError('No hay sesión activa');
    final res = await _client.from('profiles').select().eq('id', uid).single();
    return Profile.fromMap(res);
  }
}
