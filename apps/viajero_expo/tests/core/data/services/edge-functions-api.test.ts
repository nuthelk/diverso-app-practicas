import { FunctionsFetchError, FunctionsRelayError, type SupabaseClient } from '@supabase/supabase-js';

import { EdgeFunctionsApiSupabase } from '@/core/data/services/edge-functions-api';
import { ErrorFuncion } from '@/core/errors/error-funcion';

import { capturar } from '../../../support/errores';
import { crearSupabaseFalso } from '../../../support/supabase-falso';

/**
 * supabase-js NO lanza en `functions.invoke`: devuelve `{data, error}`. `EdgeFunctionsApiSupabase`
 * lo normaliza a `ErrorFuncion(status, details)` como el `FunctionException` de supabase_flutter.
 */
describe('EdgeFunctionsApiSupabase.invocar', () => {
  test('2xx con objeto JSON: lo devuelve; el cuerpo viaja como JSON', async () => {
    const { client, pedidos } = crearSupabaseFalso(() => ({ cuerpo: { checkout_url: 'u' } }));
    const r = await new EdgeFunctionsApiSupabase({ client }).invocar('pagos-iniciar', { booking_id: 'b-1' });
    expect(r).toEqual({ checkout_url: 'u' });
    expect(pedidos[0]!.metodo).toBe('POST');
    expect(pedidos[0]!.ruta).toBe('/functions/v1/pagos-iniciar');
    expect(pedidos[0]!.cuerpo).toEqual({ booking_id: 'b-1' });
  });

  test('no‑2xx: status HTTP y el cuerpo {error, mensaje} leído de error.context', async () => {
    const { client } = crearSupabaseFalso(() => ({
      status: 409,
      cuerpo: { error: 'RESERVA_VENCIDA', mensaje: 'x', estado_pago: 'aprobado_tarde' },
    }));
    const e = await capturar<ErrorFuncion>(() => new EdgeFunctionsApiSupabase({ client }).invocar('pagos-verificar', {}));
    expect(e).toBeInstanceOf(ErrorFuncion);
    expect(e.status).toBe(409);
    expect(e.details).toEqual({ error: 'RESERVA_VENCIDA', mensaje: 'x', estado_pago: 'aprobado_tarde' });
  });

  test('no‑2xx con cuerpo que no es JSON: el texto queda en details', async () => {
    const { client } = crearSupabaseFalso(() => ({ status: 502, cuerpo: undefined, headers: { 'Content-Type': 'text/plain' } }));
    const e = await capturar<ErrorFuncion>(() => new EdgeFunctionsApiSupabase({ client }).invocar('f', {}));
    expect(e.status).toBe(502);
    expect(e.details).toBe('');
  });

  test('2xx que no es un objeto JSON: ErrorFuncion con el status y lo que llegó', async () => {
    const { client } = crearSupabaseFalso(() => ({ cuerpo: ['no', 'objeto'] }));
    const e = await capturar<ErrorFuncion>(() => new EdgeFunctionsApiSupabase({ client }).invocar('f', {}));
    expect(e).toMatchObject({ status: 200, details: ['no', 'objeto'] });
  });

  test('red caída (FunctionsFetchError) o relay (FunctionsRelayError) → status 0', async () => {
    for (const error of [new FunctionsFetchError(new TypeError('Network request failed')), new FunctionsRelayError({})]) {
      const client = {
        functions: { invoke: async () => ({ data: null, error, response: undefined }) },
      } as unknown as SupabaseClient;
      const e = await capturar<ErrorFuncion>(() => new EdgeFunctionsApiSupabase({ client }).invocar('f', {}));
      expect(e).toBeInstanceOf(ErrorFuncion);
      expect(e.status).toBe(0);
    }
  });

  test('fetch que rechaza de verdad → status 0', async () => {
    const { client } = crearSupabaseFalso(() => {
      throw new TypeError('Network request failed');
    });
    const e = await capturar<ErrorFuncion>(() => new EdgeFunctionsApiSupabase({ client }).invocar('f', {}));
    expect(e.status).toBe(0);
  });
});
