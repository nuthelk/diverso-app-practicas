import { DiversoError } from '../../errors/diverso-error';
import { ErrorFuncion } from '../../errors/error-funcion';
import type { Fila } from '../../models/fila';
import type { EdgeFunctionsApi } from '../services/edge-functions-api';

/** Ejecuta [funcion] traduciendo cualquier fallo de la función a [DiversoError] (lo demás sale crudo). */
export async function llamarEdgeFunction(edgeFunctions: EdgeFunctionsApi, funcion: string, cuerpo: Fila): Promise<Fila> {
  try {
    return await edgeFunctions.invocar(funcion, cuerpo);
  } catch (e) {
    if (e instanceof ErrorFuncion) throw DiversoError.fromFunction(e);
    throw e;
  }
}
