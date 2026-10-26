// Utilidades HTTP comunes de las Edge Functions de pagos: CORS, respuestas JSON
// y errores con códigos estables en español (la app muestra su propio texto
// según `error`; `mensaje` es solo informativo).

export const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MENSAJES: Record<string, string> = {
  SOLICITUD_INVALIDA: "La solicitud no tiene el formato esperado.",
  METODO_NO_PERMITIDO: "Método HTTP no permitido.",
  NO_AUTENTICADO: "Inicia sesión para continuar.",
  RESERVA_NO_EXISTE: "La reserva no existe.",
  NO_ES_DUENO: "Esta reserva no es tuya.",
  ESTADO_INVALIDO: "La reserva no está en un estado que permita esta operación.",
  RESERVA_YA_SALIO: "El viaje ya salió: la reserva no se puede cancelar.",
  RESERVA_VENCIDA: "La reserva venció (la retención de cupos dura 30 minutos).",
  REDIRECT_NO_PERMITIDO: "La URL de retorno no está permitida.",
  REFERENCIA_DESCONOCIDA: "No hay un intento de pago con esa referencia.",
  TRANSACCION_NO_EXISTE: "Wompi no conoce esa transacción.",
  MONTO_NO_COINCIDE: "El monto o la moneda de la transacción no coincide con el intento de pago.",
  FIRMA_INVALIDA: "La firma del evento no es válida.",
  SOLO_MODO_PRUEBA: "Los pagos solo funcionan en modo de prueba (llaves y URL de sandbox).",
  WOMPI_NO_DISPONIBLE: "No se pudo consultar a Wompi; intenta de nuevo en un momento.",
  WOMPI_NO_AUTORIZADO: "Wompi rechazó la llave privada configurada.",
  SERVICIO_NO_DISPONIBLE: "No se pudo contactar el servicio de autenticación.",
  CONFIG_SUPABASE: "Falta configuración del servidor.",
  ERROR_INTERNO: "Error interno.",
};

// Sin «parameter properties»: así el módulo también corre con `node --test` (type stripping).
export class ApiError extends Error {
  status: number;
  code: string;
  extra: Record<string, unknown>;
  constructor(status: number, code: string, extra: Record<string, unknown> = {}) {
    super(code);
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

export function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" },
  });
}

/** Envuelve un handler: preflight CORS, ApiError → JSON con código estable, el resto → 500 sin detalles. */
export function manejar(handler: (req: Request) => Promise<Response>): (req: Request) => Promise<Response> {
  return async (req) => {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    try {
      return await handler(req);
    } catch (e) {
      if (e instanceof ApiError) {
        return json(e.status, { error: e.code, mensaje: MENSAJES[e.code] ?? e.code, ...e.extra });
      }
      // Nunca se registra el objeto de error completo: podría arrastrar cabeceras con llaves.
      console.error("error inesperado:", e instanceof Error ? e.name : typeof e);
      return json(500, { error: "ERROR_INTERNO", mensaje: MENSAJES.ERROR_INTERNO });
    }
  };
}

export async function leerJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const cuerpo = await req.json();
    if (cuerpo === null || typeof cuerpo !== "object" || Array.isArray(cuerpo)) throw new Error();
    return cuerpo as Record<string, unknown>;
  } catch {
    throw new ApiError(400, "SOLICITUD_INVALIDA");
  }
}

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function exigirPost(req: Request): void {
  if (req.method !== "POST") throw new ApiError(405, "METODO_NO_PERMITIDO");
}
