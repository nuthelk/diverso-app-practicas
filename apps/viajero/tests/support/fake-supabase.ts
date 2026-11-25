import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase falso a nivel HTTP: un cliente REAL de supabase-js cuyo `fetch` no sale a la red. Cada
 * pedido queda registrado y se contesta con lo que diga [responder]. Así se prueba lo que de verdad
 * le llega a PostgREST / GoTrue / Edge Functions (query string, cuerpo) y cómo supabase-js
 * convierte las respuestas de error (equivale al `HttpServer` local de `catalog_api_test.dart`).
 */
export interface HttpRequest {
  method: string;
  url: URL;
  /** `/rest/v1/plans`, `/auth/v1/token`, `/functions/v1/pagos-iniciar`… */
  path: string;
  /** Query string con todos los valores de cada clave (`queryParametersAll` de Dart). */
  params: Record<string, string[]>;
  headers: Record<string, string>;
  /** Cuerpo JSON ya parseado (o el texto si no es JSON). */
  body: unknown;
}

export interface HttpResponse {
  status?: number;
  /** Se envía como JSON; `undefined` = sin cuerpo. */
  body?: unknown;
  headers?: Record<string, string>;
}

export type Responder = (request: HttpRequest) => HttpResponse | Promise<HttpResponse>;

/** Por defecto PostgREST contesta `[]` y el resto `{}`. */
const defaultResponder: Responder = (p) => ({ body: p.path.startsWith('/rest/') ? [] : {} });

export function createFakeSupabase(responder: Responder = defaultResponder): {
  client: SupabaseClient;
  requests: HttpRequest[];
} {
  const requests: HttpRequest[] = [];

  const fakeFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const href = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const url = new URL(href);
    const params: Record<string, string[]> = {};
    url.searchParams.forEach((value, key) => {
      (params[key] ??= []).push(value);
    });
    const headers: Record<string, string> = {};
    new Headers(init?.headers).forEach((value, key) => {
      headers[key] = value;
    });
    let body: unknown = init?.body ?? null;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        // texto plano
      }
    }
    const request: HttpRequest = { method: init?.method ?? 'GET', url, path: url.pathname, params, headers, body };
    requests.push(request);

    const r = await responder(request);
    const status = r.status ?? 200;
    const noBody = r.body === undefined || status === 204;
    return new Response(noBody ? null : JSON.stringify(r.body), {
      status,
      headers: { 'Content-Type': 'application/json', ...r.headers },
    });
  };

  const client = createClient('http://127.0.0.1:54331', 'clave-de-prueba', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: fakeFetch as typeof fetch },
  });
  return { client, requests };
}

/** Error de PostgREST como lo manda el servidor (`raise exception 'CODIGO'` → 400 P0001). */
export function postgrestErrorBody(message: string, extra: { code?: string; details?: string | null } = {}) {
  return { message, code: extra.code ?? 'P0001', details: extra.details ?? null, hint: null };
}

const base64url = (o: unknown) =>
  btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/** Respuesta de GoTrue con una sesión válida (sign in / sign up con confirmación desactivada). */
export function fakeSession(userId = 'viajero-1', email = 'ana@diverso.test') {
  const now = Math.floor(Date.now() / 1000);
  const token = `${base64url({ alg: 'HS256', typ: 'JWT' })}.${base64url({
    sub: userId,
    email,
    role: 'authenticated',
    aud: 'authenticated',
    exp: now + 3600,
    iat: now,
  })}.firma`;
  return {
    access_token: token,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: now + 3600,
    refresh_token: 'refresh-falso',
    user: {
      id: userId,
      aud: 'authenticated',
      role: 'authenticated',
      email,
      app_metadata: { provider: 'email' },
      user_metadata: {},
      created_at: new Date().toISOString(),
    },
  };
}
