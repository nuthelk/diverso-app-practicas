// reservas-cancelar — el viajero (JWT) cancela su reserva. La política del plan
// (ventana gratuita / tramo parcial / sin reembolso) la decide la función SQL
// cancelar_reserva; aquí solo se pide a Wompi (sandbox) el reembolso que la
// política concede. Si Wompi no responde, el reembolso queda «pendiente» y
// volver a llamar a esta función lo reanuda (la cancelación es idempotente).
//
// POST { booking_id } → 200 { estado:'cancelada',
//   reembolso: { aplica, porcentaje, monto, estado:'aprobado'|'pendiente'|'rechazado'|'no_aplica', motivo } }
import { ApiError, exigirPost, json, leerJson, manejar, UUID } from "../_shared/http.ts";
import { contexto } from "../_shared/runtime.ts";
import { rpc, usuarioDesdeJwt } from "../_shared/db.ts";
import { procesarReembolso } from "../_shared/pagos.ts";

Deno.serve(manejar(async (req) => {
  exigirPost(req);
  const { env, wompi } = contexto();
  const usuario = await usuarioDesdeJwt(env, req);

  const cuerpo = await leerJson(req);
  const bookingId = cuerpo.booking_id;
  if (typeof bookingId !== "string" || !UUID.test(bookingId)) throw new ApiError(400, "SOLICITUD_INVALIDA");

  const r = await rpc(env, "cancelar_reserva", { p_booking_id: bookingId, p_viajero_id: usuario.id });
  const reembolso = r.reembolso;
  let estado: string = reembolso.estado;
  if (estado === "pendiente" && reembolso.refund_id) {
    estado = await procesarReembolso(env, wompi, reembolso.refund_id);
  }

  return json(200, {
    estado: "cancelada",
    reembolso: {
      aplica: reembolso.aplica,
      porcentaje: reembolso.porcentaje,
      monto: reembolso.monto,
      estado,
      motivo: reembolso.motivo,
    },
  });
}));
