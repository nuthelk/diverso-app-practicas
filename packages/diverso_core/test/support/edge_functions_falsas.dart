import 'package:diverso_core/diverso_core.dart';

/// Edge Functions falsas: registran cada llamada y devuelven (o lanzan) lo que se les indique,
/// igual que `client.functions.invoke` (sin red).
class EdgeFunctionsFalsas implements EdgeFunctionsApi {
  EdgeFunctionsFalsas(this.respuesta);

  final Object Function(String funcion, Map<String, dynamic> cuerpo) respuesta;
  final llamadas = <(String, Map<String, dynamic>)>[];

  @override
  Future<Map<String, dynamic>> invocar(String funcion, Map<String, dynamic> cuerpo) async {
    llamadas.add((funcion, cuerpo));
    final r = respuesta(funcion, cuerpo);
    if (r is Map<String, dynamic>) return r;
    throw r;
  }
}
