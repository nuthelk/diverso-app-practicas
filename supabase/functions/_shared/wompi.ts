// Cliente de Wompi: firma de integridad, checksum de eventos y llamadas a la API.
// Las funciones criptográficas usan solo Web Crypto (sin Deno.*) para poder
// probarse con los vectores oficiales de la documentación desde Node o Deno.
import { ApiError } from "./http.ts";
import type { ConfigWompi } from "./config.ts";

// ---------------------------------------------------------------------------
// Criptografía
// ---------------------------------------------------------------------------
export async function sha256Hex(texto: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** SHA-256 hex (minúscula) de `referencia + montoEnCentavos + moneda [+ expiración] + secretoDeIntegridad`. */
export function firmaIntegridad(
  referencia: string,
  montoEnCentavos: number | string,
  moneda: string,
  expiracionIso: string | undefined,
  secretoIntegridad: string,
): Promise<string> {
  return sha256Hex(`${referencia}${montoEnCentavos}${moneda}${expiracionIso ?? ""}${secretoIntegridad}`);
}

/** Lee `transaction.id` dentro de `data`; solo acepta escalares (string/number/boolean). */
export function valorEnData(data: unknown, ruta: string): string | undefined {
  let actual: unknown = data;
  for (const clave of ruta.split(".")) {
    if (actual === null || typeof actual !== "object") return undefined;
    actual = (actual as Record<string, unknown>)[clave];
  }
  return ["string", "number", "boolean"].includes(typeof actual) ? String(actual) : undefined;
}

export interface EventoWompi {
  event?: string;
  data?: Record<string, unknown>;
  timestamp?: number | string;
  signature?: { properties?: string[]; checksum?: string };
}

/**
 * Checksum esperado de un evento (hex en mayúsculas): SHA-256 de los valores de
 * `signature.properties` (en ese orden, leídos del propio evento) + `timestamp` + secreto de eventos.
 * Devuelve null si el evento no trae lo necesario para calcularlo.
 */
export async function checksumEvento(evento: EventoWompi, secretoEventos: string): Promise<string | null> {
  const props = evento.signature?.properties;
  if (!Array.isArray(props) || props.length === 0 || evento.timestamp === undefined || evento.timestamp === null) {
    return null;
  }
  let concatenado = "";
  for (const ruta of props) {
    if (typeof ruta !== "string" || !/^[A-Za-z0-9_.]+$/.test(ruta)) return null;
    const valor = valorEnData(evento.data, ruta);
    if (valor === undefined) return null;
    concatenado += valor;
  }
  return (await sha256Hex(`${concatenado}${evento.timestamp}${secretoEventos}`)).toUpperCase();
}

/** Comparación en tiempo constante, sin distinguir mayúsculas (Wompi la documenta así). */
export function igualesTiempoConstante(a: string, b: string): boolean {
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
}

/**
 * Un evento es auténtico si el checksum recalculado coincide con `signature.checksum`
 * y, cuando Wompi lo envía, también con la cabecera `X-Event-Checksum`.
 */
export async function eventoAutentico(
  evento: EventoWompi,
  checksumCabecera: string | null,
  secretoEventos: string,
): Promise<boolean> {
  const esperado = await checksumEvento(evento, secretoEventos);
  const recibido = evento.signature?.checksum;
  if (esperado === null || typeof recibido !== "string") return false;
  if (!igualesTiempoConstante(esperado, recibido)) return false;
  return checksumCabecera === null || igualesTiempoConstante(esperado, checksumCabecera);
}

// ---------------------------------------------------------------------------
// URL del Web Checkout
// ---------------------------------------------------------------------------
export function construirCheckoutUrl(
  cfg: ConfigWompi,
  p: {
    referencia: string;
    amountInCents: number;
    moneda: string;
    firma: string;
    redirectUrl: string;
    expiracionIso: string;
    email?: string;
    nombre?: string;
  },
): string {
  const q: [string, string][] = [
    ["public-key", cfg.publicKey],
    ["currency", p.moneda],
    ["amount-in-cents", String(p.amountInCents)],
    ["reference", p.referencia],
    ["signature:integrity", p.firma],
    ["redirect-url", p.redirectUrl],
    ["expiration-time", p.expiracionIso],
  ];
  if (p.email) q.push(["customer-data:email", p.email]);
  if (p.nombre) q.push(["customer-data:full-name", p.nombre]);
  // Las claves llevan ":" literal (así las documenta Wompi); solo los valores se codifican.
  const base = cfg.checkoutUrl.includes("?") ? cfg.checkoutUrl : `${cfg.checkoutUrl}?`;
  return base + q.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
}

// ---------------------------------------------------------------------------
// API de Wompi (llave privada, solo desde el servidor)
// ---------------------------------------------------------------------------
export interface TransaccionWompi {
  id: string;
  reference: string;
  status: string;
  amount_in_cents: number;
  currency: string;
  payment_method_type: string | null;
  status_message: string | null;
}

export interface ReembolsoWompi {
  id: string | null;
  estado: "aprobado" | "pendiente" | "rechazado";
}

/** Reduce la respuesta de Wompi a los campos que se guardan (sin datos del pagador ni del medio de pago). */
export function normalizarTransaccion(d: Record<string, unknown>): TransaccionWompi {
  return {
    id: String(d.id),
    reference: String(d.reference ?? ""),
    status: String(d.status ?? ""),
    amount_in_cents: Number(d.amount_in_cents),
    currency: String(d.currency ?? "COP"),
    payment_method_type: d.payment_method_type ? String(d.payment_method_type) : null,
    status_message: d.status_message ? String(d.status_message) : null,
  };
}

export function estadoReembolso(estadoWompi: string): ReembolsoWompi["estado"] {
  if (estadoWompi === "APPROVED") return "aprobado";
  if (["DECLINED", "ERROR", "CANCELLED", "VOIDED"].includes(estadoWompi)) return "rechazado";
  return "pendiente";
}

export class WompiClient {
  private cfg: ConfigWompi;
  constructor(cfg: ConfigWompi) {
    this.cfg = cfg;
  }

  private async llamar(metodo: string, ruta: string, cuerpo?: unknown): Promise<Response> {
    try {
      return await fetch(`${this.cfg.apiUrl}${ruta}`, {
        method: metodo,
        headers: {
          Authorization: `Bearer ${this.cfg.privateKey}`,
          Accept: "application/json",
          ...(cuerpo === undefined ? {} : { "Content-Type": "application/json" }),
        },
        body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      throw new ApiError(502, "WOMPI_NO_DISPONIBLE");
    }
  }

  /** Transacción por id, o null si Wompi no la conoce. */
  async obtenerTransaccion(id: string): Promise<TransaccionWompi | null> {
    const r = await this.llamar("GET", `/transactions/${encodeURIComponent(id)}`);
    if (r.status === 404) return null;
    if (r.status === 401 || r.status === 403) throw new ApiError(502, "WOMPI_NO_AUTORIZADO");
    if (!r.ok) throw new ApiError(502, "WOMPI_NO_DISPONIBLE");
    const cuerpo = await r.json();
    return normalizarTransaccion((cuerpo.data ?? cuerpo) as Record<string, unknown>);
  }

  /**
   * Transacciones de una referencia. El listado por referencia NO está confirmado en la
   * documentación oficial (T7): si Wompi no lo ofrece, se devuelve [] y el flujo cae a esperar
   * el id (redirección) o el webhook.
   */
  async buscarPorReferencia(referencia: string): Promise<TransaccionWompi[]> {
    try {
      const r = await this.llamar("GET", `/transactions?reference=${encodeURIComponent(referencia)}`);
      if (!r.ok) return [];
      const cuerpo = await r.json();
      const lista = Array.isArray(cuerpo.data) ? cuerpo.data : [];
      return lista.map((d: Record<string, unknown>) => normalizarTransaccion(d));
    } catch {
      return [];
    }
  }

  /** Reembolso V2 de sandbox (`POST /v1/refunds`). Acepta la respuesta síncrona (201) y la asíncrona (202 PENDING). */
  async crearReembolso(p: {
    transactionId: string;
    amountInCents: number;
    motivo: string;
    referencia: string;
  }): Promise<ReembolsoWompi> {
    const r = await this.llamar("POST", "/refunds", {
      transaction_id: p.transactionId,
      amount_in_cents: p.amountInCents,
      reason: p.motivo,
      reference: p.referencia,
      test_scenario: "approved",
    });
    if (r.status === 401 || r.status === 403) throw new ApiError(502, "WOMPI_NO_AUTORIZADO");
    // 409 = idempotencia: Wompi devuelve el reembolso ya existente.
    if (!r.ok && r.status !== 409) throw new ApiError(502, "WOMPI_NO_DISPONIBLE");
    return leerReembolso(await r.json());
  }

  async obtenerReembolso(id: string): Promise<ReembolsoWompi> {
    const r = await this.llamar("GET", `/refunds/${encodeURIComponent(id)}`);
    if (!r.ok) throw new ApiError(502, "WOMPI_NO_DISPONIBLE");
    return leerReembolso(await r.json());
  }
}

function leerReembolso(cuerpo: Record<string, unknown>): ReembolsoWompi {
  const d = (cuerpo.data ?? cuerpo) as Record<string, unknown>;
  const id = d.v2_refund_id ?? d.refund_id ?? d.id;
  return { id: id === undefined || id === null ? null : String(id), estado: estadoReembolso(String(d.status ?? "")) };
}
