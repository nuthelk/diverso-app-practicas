import 'package:supabase_flutter/supabase_flutter.dart';

import '../../errors/diverso_exception.dart';
import '../services/edge_functions_api.dart';

/// Ejecuta [funcion] en [edgeFunctions] traduciendo cualquier fallo de la función a
/// [DiversoException].
Future<Map<String, dynamic>> llamarEdgeFunction(
  EdgeFunctionsApi edgeFunctions,
  String funcion,
  Map<String, dynamic> cuerpo,
) async {
  try {
    return await edgeFunctions.invocar(funcion, cuerpo);
  } on FunctionException catch (e) {
    throw DiversoException.fromFunction(e);
  }
}
