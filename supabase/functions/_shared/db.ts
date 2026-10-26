// Acceso a Supabase desde las Edge Functions con fetch (sin dependencias):
//  * el JWT del viajero solo sirve para saber QUIÉN llama (GoTrue);
//  * la llave service_role vive únicamente aquí, en el servidor, y es la única
//    que puede ejecutar las funciones SQL de pagos y reembolsos.
import { ApiError } from "./http.ts";
import type { LectorEnv } from "./config.ts";

export interface EntornoSupabase {
  url: string;
  anonKey: string;
  serviceKey: string;
}

export function entornoSupabase(leer: LectorEnv): EntornoSupabase {
  const url = leer("SUPABASE_URL");
  const anonKey = leer("SUPABASE_ANON_KEY");
  const serviceKey = leer("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) throw new ApiError(500, "CONFIG_SUPABASE");
  return { url: url.replace(/\/+$/, ""), anonKey, serviceKey };
}

export interface Usuario {
  id: string;
  email?: string;
}

/** Identifica al viajero que llama a partir de su JWT. */
export async function usuarioDesdeJwt(env: EntornoSupabase, req: Request): Promise<Usuario> {
  const auth = req.headers.get("Authorization") ?? "";
  if (!/^Bearer\s+\S+/i.test(auth)) throw new ApiError(401, "NO_AUTENTICADO");
  let r: Response;
  try {
    r = await fetch(`${env.url}/auth/v1/user`, {
      headers: { apikey: env.anonKey, Authorization: auth },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new ApiError(502, "SERVICIO_NO_DISPONIBLE");
  }
  if (!r.ok) throw new ApiError(401, "NO_AUTENTICADO");
  const u = await r.json();
  if (!u?.id) throw new ApiError(401, "NO_AUTENTICADO");
  return { id: u.id, email: u.email };
}

// Errores que las funciones SQL lanzan con `raise exception 'CODIGO'`.
const ERRORES_SQL: Record<string, number> = {
  RESERVA_NO_EXISTE: 404,
  NO_ES_DUENO: 403,
  ESTADO_INVALIDO: 409,
  RESERVA_VENCIDA: 409,
  RESERVA_YA_SALIO: 409,
  REEMBOLSO_NO_EXISTE: 404,
};

function cabecerasServicio(env: EntornoSupabase): Record<string, string> {
  return { apikey: env.serviceKey, Authorization: `Bearer ${env.serviceKey}`, "Content-Type": "application/json" };
}

/** Ejecuta una función SQL (PostgREST /rpc) con service_role. Traduce `raise exception` a ApiError. */
// deno-lint-ignore no-explicit-any
export async function rpc(env: EntornoSupabase, nombre: string, args: Record<string, unknown>): Promise<any> {
  const r = await fetch(`${env.url}/rest/v1/rpc/${nombre}`, {
    method: "POST",
    headers: cabecerasServicio(env),
    body: JSON.stringify(args),
    signal: AbortSignal.timeout(15_000),
  });
  if (r.ok) return await r.json();
  const err = await r.json().catch(() => ({}));
  const codigo = typeof err.message === "string" ? err.message : "";
  if (codigo in ERRORES_SQL) throw new ApiError(ERRORES_SQL[codigo], codigo);
  console.error(`rpc ${nombre} falló: HTTP ${r.status} ${codigo.slice(0, 120)}`);
  throw new ApiError(500, "ERROR_INTERNO");
}

/** Lectura de tabla con service_role. `consulta` es el query string de PostgREST (ya codificado). */
// deno-lint-ignore no-explicit-any
export async function seleccionar(env: EntornoSupabase, tabla: string, consulta: string): Promise<any[]> {
  const r = await fetch(`${env.url}/rest/v1/${tabla}?${consulta}`, {
    headers: cabecerasServicio(env),
    signal: AbortSignal.timeout(15_000),
  });
  if (!r.ok) {
    console.error(`select ${tabla} falló: HTTP ${r.status}`);
    throw new ApiError(500, "ERROR_INTERNO");
  }
  return await r.json();
}
