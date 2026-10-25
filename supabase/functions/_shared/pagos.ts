// Flujos compartidos entre pagos-verificar, pagos-webhook y reservas-cancelar.
// La verdad sobre reservas, pagos y reembolsos vive en las funciones SQL de la
// migración 0003; aquí solo se traduce lo que dice Wompi a esas llamadas.
import { ApiError } from "./http.ts";
import { type EntornoSupabase, rpc, seleccionar } from "./db.ts";
import type { TransaccionWompi, WompiClient } from "./wompi.ts";

export interface ResultadoPago {
  resultado:
    | "confirmada"
    | "ya_confirmada"
    | "rechazado"
    | "pendiente"
    | "monto_no_coincide"
    | "aprobado_tarde"
    | "ya_aprobado_tarde"
    | "referencia_desconocida";
  referencia?: string;
  booking_id?: string;
  booking_codigo?: string;
  booking_estado?: string;
  metodo?: string | null;
  refund_id?: string | null;
  refund_estado?: string | null;
}

/** Aplica una transacción de Wompi (única puerta de entrada a reservas y pagos). */
export async function aplicarTransaccion(env: EntornoSupabase, tx: TransaccionWompi): Promise<ResultadoPago> {
  return await rpc(env, "aplicar_resultado_pago", {
    p_referencia: tx.reference,
    p_transaction_id: tx.id,
    p_status: tx.status,
    p_amount_in_cents: tx.amount_in_cents,
    p_metodo: tx.payment_method_type,
    p_raw: tx,
    p_moneda: tx.currency,
    p_status_message: tx.status_message,
  });
}

/**
 * Pide a Wompi el reembolso pendiente `refundId` (o refresca su estado si ya se pidió) y registra
 * el desenlace. Si Wompi no responde, el reembolso queda «pendiente» y se reintenta al volver a
 * llamar a reservas-cancelar / al reenviarse el webhook: nunca se pierde.
 */
export async function procesarReembolso(
  env: EntornoSupabase,
  wompi: WompiClient,
  refundId: string,
): Promise<"aprobado" | "pendiente" | "rechazado"> {
  const [r] = await seleccionar(
    env,
    "refunds",
    `id=eq.${encodeURIComponent(refundId)}&select=id,estado,simulado,referencia,wompi_transaction_id,wompi_refund_id,monto,motivo`,
  );
  if (!r) throw new ApiError(404, "REEMBOLSO_NO_EXISTE");
  if (r.estado !== "pendiente" || r.simulado || !r.wompi_transaction_id) return r.estado;

  try {
    const res = r.wompi_refund_id
      ? await wompi.obtenerReembolso(r.wompi_refund_id)
      : await wompi.crearReembolso({
        transactionId: r.wompi_transaction_id,
        amountInCents: Math.round(Number(r.monto) * 100),
        motivo: r.motivo,
        referencia: r.referencia,
      });
    await rpc(env, "registrar_resultado_reembolso", {
      p_refund_id: r.id,
      p_estado: res.estado,
      p_wompi_refund_id: res.id,
      p_raw: res,
    });
    return res.estado;
  } catch (e) {
    if (e instanceof ApiError && e.status === 502) {
      console.error(`reembolso ${r.referencia} queda pendiente: ${e.code}`);
      return "pendiente";
    }
    throw e;
  }
}
