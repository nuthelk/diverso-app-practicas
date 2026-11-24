import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase falso a nivel HTTP: un cliente REAL de supabase-js cuyo `fetch` no sale a la red. Cada
 * pedido queda registrado y se contesta con lo que diga [responder]. Así se prueba lo que de verdad
 * le llega a PostgREST / GoTrue / Edge Functions (query string, cuerpo) y cómo supabase-js
 * convierte las respuestas de error (equivale al `HttpServer` local de `catalog_api_test.dart`).
 */
export interface PedidoHttp {
  metodo: string;
  url: URL;
  /** `/rest/v1/plans`, `/auth/v1/token`, `/functions/v1/pagos-iniciar`… */
  ruta: string;
  /** Query string con todos los valores de cada clave (`queryParametersAll` de Dart). */
  params: Record<string, string[]>;
  headers: Record<string, string>;
  /** Cuerpo JSON ya parseado (o el texto si no es JSON). */
  cuerpo: unknown;
}

export interface RespuestaHttp {
  status?: number;
  /** Se envía como JSON; `undefined` = sin cuerpo. */
  cuerpo?: unknown;
  headers?: Record<string, string>;
}

export type Responder = (pedido: PedidoHttp) => RespuestaHttp | Promise<RespuestaHttp>;

/** Por defecto PostgREST contesta `[]` y el resto `{}`. */
const responderPorDefecto: Responder = (p) => ({ cuerpo: p.ruta.startsWith('/rest/') ? [] : {} });

export function crearSupabaseFalso(responder: Responder = responderPorDefecto): {
  client: SupabaseClient;
  pedidos: PedidoHttp[];
} {
  const pedidos: PedidoHttp[] = [];

  const fetchFalso = async (entrada: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const href = typeof entrada === 'string' ? entrada : entrada instanceof URL ? entrada.href : entrada.url;
    const url = new URL(href);
    const params: Record<string, string[]> = {};
    url.searchParams.forEach((valor, clave) => {
      (params[clave] ??= []).push(valor);
    });
    const headers: Record<string, string> = {};
    new Headers(init?.headers).forEach((valor, clave) => {
      headers[clave] = valor;
    });
    let cuerpo: unknown = init?.body ?? null;
    if (typeof cuerpo === 'string') {
      try {
        cuerpo = JSON.parse(cuerpo);
      } catch {
        // texto plano
      }
    }
    const pedido: PedidoHttp = { metodo: init?.method ?? 'GET', url, ruta: url.pathname, params, headers, cuerpo };
    pedidos.push(pedido);

    const r = await responder(pedido);
    const status = r.status ?? 200;
    const sinCuerpo = r.cuerpo === undefined || status === 204;
    return new Response(sinCuerpo ? null : JSON.stringify(r.cuerpo), {
      status,
      headers: { 'Content-Type': 'application/json', ...r.headers },
    });
  };

  const client = createClient('http://127.0.0.1:54331', 'clave-de-prueba', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: fetchFalso as typeof fetch },
  });
  return { client, pedidos };
}

/** Error de PostgREST como lo manda el servidor (`raise exception 'CODIGO'` → 400 P0001). */
export function cuerpoErrorPostgrest(message: string, extra: { code?: string; details?: string | null } = {}) {
  return { message, code: extra.code ?? 'P0001', details: extra.details ?? null, hint: null };
}

const base64url = (o: unknown) =>
  btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/** Respuesta de GoTrue con una sesión válida (sign in / sign up con confirmación desactivada). */
export function sesionFalsa(userId = 'viajero-1', email = 'ana@diverso.test') {
  const ahora = Math.floor(Date.now() / 1000);
  const token = `${base64url({ alg: 'HS256', typ: 'JWT' })}.${base64url({
    sub: userId,
    email,
    role: 'authenticated',
    aud: 'authenticated',
    exp: ahora + 3600,
    iat: ahora,
  })}.firma`;
  return {
    access_token: token,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: ahora + 3600,
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
