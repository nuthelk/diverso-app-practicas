import 'package:supabase_flutter/supabase_flutter.dart';

import '../legal.dart';
import '../models/profile.dart';

class AuthService {
  SupabaseClient get _client => Supabase.instance.client;

  /// Inicia sesión con email y contraseña.
  Future<void> signIn({required String email, required String password}) async {
    await _client.auth.signInWithPassword(email: email, password: password);
  }

  /// Registra un viajero nuevo. El trigger handle_new_user crea su perfil
  /// y, si [aceptaDocumentos] es verdadero, guarda como evidencia la
  /// autorización de datos y la aceptación de términos (Ley 1581 de 2012).
  Future<void> signUpViajero({
    required String nombre,
    required String email,
    required String password,
    required bool aceptaDocumentos,
  }) async {
    if (!aceptaDocumentos) {
      throw ArgumentError('Se requiere la autorización expresa del titular.');
    }
    await _client.auth.signUp(
      email: email,
      password: password,
      data: {'nombre': nombre, 'rol': 'viajero', 'consentimiento_version': kVersionLegal},
    );
  }

  /// Documentos vigentes que el usuario actual aún no ha aceptado
  /// (tratamiento_datos, terminos_viajero…). Vacío si está al día.
  Future<List<String>> consentimientosPendientes() async {
    final res = await _client.rpc('consentimientos_pendientes');
    if (res is List) return res.map((e) => e.toString()).toList();
    return const [];
  }

  /// Registra la aceptación de un documento en su versión vigente.
  Future<void> registrarConsentimiento(String tipo) async {
    await _client.rpc(
      'registrar_consentimiento',
      params: {'p_tipo': tipo, 'p_version': kVersionLegal, 'p_origen': 'app'},
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
