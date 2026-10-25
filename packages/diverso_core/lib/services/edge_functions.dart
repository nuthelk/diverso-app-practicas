import 'package:supabase_flutter/supabase_flutter.dart';

import 'booking_service.dart' show DiversoException;

/// Llama a una Edge Function con el cuerpo JSON y devuelve el JSON de la respuesta 2xx.
/// Una respuesta de error lanza [FunctionException] (como `functions.invoke`).
typedef FunctionInvoker = Future<Map<String, dynamic>> Function(
  String funcion,
  Map<String, dynamic> cuerpo,
);

/// Invocador real: `Supabase.instance.client.functions.invoke` envía la sesión del usuario
/// (JWT) en `Authorization`; la app nunca ve llaves de Wompi.
Future<Map<String, dynamic>> invocarEdgeFunction(
  String funcion,
  Map<String, dynamic> cuerpo,
) async {
  final res = await Supabase.instance.client.functions.invoke(funcion, body: cuerpo);
  final data = res.data;
  if (data is Map) return data.cast<String, dynamic>();
  throw FunctionException(status: res.status, details: data);
}

/// Ejecuta [invocar] traduciendo cualquier fallo de la función a [DiversoException].
Future<Map<String, dynamic>> llamarEdgeFunction(
  FunctionInvoker invocar,
  String funcion,
  Map<String, dynamic> cuerpo,
) async {
  try {
    return await invocar(funcion, cuerpo);
  } on FunctionException catch (e) {
    throw DiversoException.fromFunction(e);
  }
}
