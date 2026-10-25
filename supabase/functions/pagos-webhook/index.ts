// pagos-webhook — Wompi notifica eventos (sin JWT: verify_jwt = false en config.toml).
// La autenticidad sale del checksum del evento (SHA-256 con el secreto de eventos),
// comparado en tiempo constante. Un checksum inválido → 401 sin ningún efecto.
// Responde 200 también a lo que ignora (eventos de otro tipo, referencias ajenas),
// porque Wompi reintenta mientras la respuesta no sea 200.
//
// transaction.updated → aplicar_resultado_pago (idempotente: un reenvío nunca confirma dos veces)
// refund.updated      → registrar_resultado_reembolso
import { ApiError, exigirPost, json, manejar } from "../_shared/http.ts";
import { contexto } from "../_shared/runtime.ts";
import { rpc, seleccionar } from "../_shared/db.ts";
import { estadoReembolso, eventoAutentico, type EventoWompi, normalizarTransaccion } from "../_shared/wompi.ts";
import { aplicarTransaccion, procesarReembolso } from "../_shared/pagos.ts";

// Campos que el checksum DEBE cubrir para que el estado y el monto sean de fiar.
const FIRMADOS_TRANSACCION = ["transaction.id", "transaction.status", "transaction.amount_in_cents"];
const FIRMADOS_REEMBOLSO = ["refund.refund_id", "refund.status"];

const cubre = (e: EventoWompi, requeridos: string[]) =>
  requeridos.every((r) => e.signature?.properties?.includes(r));

Deno.serve(manejar(async (req) => {
  exigirPost(req);
  const { cfg, env, wompi } = contexto();

  let evento: EventoWompi;
  try {
    evento = await req.json();
    if (evento === null || typeof evento !== "object") throw new Error();
  } catch {
    throw new ApiError(400, "SOLICITUD_INVALIDA");
  }
  if (!(await eventoAutentico(evento, req.headers.get("X-Event-Checksum"), cfg.eventsSecret))) {
    throw new ApiError(401, "FIRMA_INVALIDA");
  }

  if (evento.event === "transaction.updated") {
    const crudo = (evento.data as { transaction?: Record<string, unknown> } | undefined)?.transaction;
    if (!crudo || !cubre(evento, FIRMADOS_TRANSACCION)) throw new ApiError(401, "FIRMA_INVALIDA");
    const resultado = await aplicarTransaccion(env, normalizarTransaccion(crudo));
    if (resultado.resultado === "aprobado_tarde" || resultado.resultado === "ya_aprobado_tarde") {
      if (resultado.refund_id) await procesarReembolso(env, wompi, resultado.refund_id);
    }
    return json(200, { ok: true, resultado: resultado.resultado });
  }

  if (evento.event === "refund.updated") {
    const crudo = (evento.data as { refund?: Record<string, unknown> } | undefined)?.refund;
    if (!crudo || !cubre(evento, FIRMADOS_REEMBOLSO)) throw new ApiError(401, "FIRMA_INVALIDA");
    const wompiRefundId = String(crudo.refund_id);
    const [reembolso] = await seleccionar(
      env,
      "refunds",
      `wompi_refund_id=eq.${encodeURIComponent(wompiRefundId)}&select=id&limit=1`,
    );
    if (!reembolso) return json(200, { ok: true, ignorado: "REEMBOLSO_DESCONOCIDO" });
    await rpc(env, "registrar_resultado_reembolso", {
      p_refund_id: reembolso.id,
      p_estado: estadoReembolso(String(crudo.status)),
      p_wompi_refund_id: wompiRefundId,
      p_raw: crudo,
      p_motivo: null,
    });
    return json(200, { ok: true, resultado: "reembolso_registrado" });
  }

  return json(200, { ok: true, ignorado: String(evento.event ?? "") });
}));
