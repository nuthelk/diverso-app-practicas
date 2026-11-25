import { DiversoError } from '../../errors/diverso-error';
import { FunctionError } from '../../errors/function-error';
import type { Row } from '../../models/row';
import type { EdgeFunctionsApi } from '../services/edge-functions-api';

/** Ejecuta [fn] traduciendo cualquier fallo de la función a [DiversoError] (lo demás sale crudo). */
export async function callEdgeFunction(edgeFunctions: EdgeFunctionsApi, fn: string, body: Row): Promise<Row> {
  try {
    return await edgeFunctions.invoke(fn, body);
  } catch (e) {
    if (e instanceof FunctionError) throw DiversoError.fromFunction(e);
    throw e;
  }
}
