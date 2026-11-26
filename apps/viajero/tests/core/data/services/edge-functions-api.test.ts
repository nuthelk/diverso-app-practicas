import { FunctionsFetchError, FunctionsRelayError, type SupabaseClient } from '@supabase/supabase-js';

import { EdgeFunctionsApiSupabase } from '@/core/data/services/edge-functions-api';
import { FunctionError } from '@/core/errors/function-error';

import { capture } from '../../../support/errors';
import { createFakeSupabase } from '../../../support/fake-supabase';

/**
 * supabase-js NO lanza en `functions.invoke`: devuelve `{data, error}`. `EdgeFunctionsApiSupabase`
 * lo normaliza a `FunctionError(status, details)` como el `FunctionException` de supabase_flutter.
 */
describe('EdgeFunctionsApiSupabase.invocar', () => {
  test('2xx con objeto JSON: lo devuelve; el cuerpo viaja como JSON', async () => {
    const { client, requests } = createFakeSupabase(() => ({ body: { checkout_url: 'u' } }));
    const r = await new EdgeFunctionsApiSupabase({ client }).invoke('pagos-iniciar', { booking_id: 'b-1' });
    expect(r).toEqual({ checkout_url: 'u' });
    expect(requests[0]!.method).toBe('POST');
    expect(requests[0]!.path).toBe('/functions/v1/pagos-iniciar');
    expect(requests[0]!.body).toEqual({ booking_id: 'b-1' });
  });

  test('no‑2xx: status HTTP y el cuerpo {error, mensaje} leído de error.context', async () => {
    const { client } = createFakeSupabase(() => ({
      status: 409,
      body: { error: 'RESERVA_VENCIDA', mensaje: 'x', estado_pago: 'aprobado_tarde' },
    }));
    const e = await capture<FunctionError>(() => new EdgeFunctionsApiSupabase({ client }).invoke('pagos-verificar', {}));
    expect(e).toBeInstanceOf(FunctionError);
    expect(e.status).toBe(409);
    expect(e.details).toEqual({ error: 'RESERVA_VENCIDA', mensaje: 'x', estado_pago: 'aprobado_tarde' });
  });

  test('no‑2xx con cuerpo que no es JSON: el texto queda en details', async () => {
    const { client } = createFakeSupabase(() => ({ status: 502, body: undefined, headers: { 'Content-Type': 'text/plain' } }));
    const e = await capture<FunctionError>(() => new EdgeFunctionsApiSupabase({ client }).invoke('f', {}));
    expect(e.status).toBe(502);
    expect(e.details).toBe('');
  });

  test('2xx que no es un objeto JSON: FunctionError con el status y lo que llegó', async () => {
    const { client } = createFakeSupabase(() => ({ body: ['no', 'objeto'] }));
    const e = await capture<FunctionError>(() => new EdgeFunctionsApiSupabase({ client }).invoke('f', {}));
    expect(e).toMatchObject({ status: 200, details: ['no', 'objeto'] });
  });

  test('red caída (FunctionsFetchError) o relay (FunctionsRelayError) → status 0', async () => {
    for (const error of [new FunctionsFetchError(new TypeError('Network request failed')), new FunctionsRelayError({})]) {
      const client = {
        functions: { invoke: async () => ({ data: null, error, response: undefined }) },
      } as unknown as SupabaseClient;
      const e = await capture<FunctionError>(() => new EdgeFunctionsApiSupabase({ client }).invoke('f', {}));
      expect(e).toBeInstanceOf(FunctionError);
      expect(e.status).toBe(0);
    }
  });

  test('fetch que rechaza de verdad → status 0', async () => {
    const { client } = createFakeSupabase(() => {
      throw new TypeError('Network request failed');
    });
    const e = await capture<FunctionError>(() => new EdgeFunctionsApiSupabase({ client }).invoke('f', {}));
    expect(e.status).toBe(0);
  });
});
