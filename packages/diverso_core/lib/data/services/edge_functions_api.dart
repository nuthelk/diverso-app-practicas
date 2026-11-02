import 'package:supabase_flutter/supabase_flutter.dart';

/// Edge Functions de Supabase. `functions.invoke` envía la sesión del usuario (JWT) en
/// `Authorization`; la app nunca ve llaves de Wompi.
class EdgeFunctionsApi {
  EdgeFunctionsApi({required SupabaseClient client}) : _client = client;

  final SupabaseClient _client;

  /// Llama a [funcion] con el cuerpo JSON y devuelve el JSON de la respuesta 2xx.
  /// Una respuesta de error lanza [FunctionException] (como `functions.invoke`).
  Future<Map<String, dynamic>> invocar(String funcion, Map<String, dynamic> cuerpo) async {
    final res = await _client.functions.invoke(funcion, body: cuerpo);
    final data = res.data;
    if (data is Map) return data.cast<String, dynamic>();
    throw FunctionException(status: res.status, details: data);
  }
}
