// pagos-verificar — el viajero (JWT) pregunta cómo quedó su pago.
// NUNCA se confía en la redirección del navegador: se consulta a Wompi con la
// llave privada y el resultado entra por aplicar_resultado_pago (idempotente,
// la misma puerta que usa el webhook).
//
// POST { transaction_id } | { booking_id } →
//   200 { estado_pago: 'aprobado'|'rechazado'|'pendiente'|'error', metodo, referencia,
//         booking: { id, codigo, estado } }
//   409 MONTO_NO_COINCIDE (+ reembolso del 100 % de lo cobrado) ·
//   409 RESERVA_VENCIDA (+ estado_pago:'aprobado_tarde', reembolso)
import { ApiError, exigirPost, json, leerJson, manejar, UUID } from "../_shared/http.ts";
import { contexto } from "../_shared/runtime.ts";
import { seleccionar, usuarioDesdeJwt } from "../_shared/db.ts";
import type { TransaccionWompi } from "../_shared/wompi.ts";
import { aplicarTransaccion, procesarReembolso, type ResultadoPago } from "../_shared/pagos.ts";

const ID_TRANSACCION = /^[A-Za-z0-9_-]{1,100}$/;
// Desenlaces que cierran la consulta; «pendiente» y «rechazado» pueden cambiar con otro intento.
const DEFINITIVOS = new Set([
  "confirmada",
  "ya_confirmada",
  "aprobado_tarde",
  "ya_aprobado_tarde",
  "monto_no_coincide",
]);

Deno.serve(manejar(async (req) => {
  exigirPost(req);
  const { env, wompi } = contexto();
  const usuario = await usuarioDesdeJwt(env, req);
  const cuerpo = await leerJson(req);

  const transaccionId = cuerpo.transaction_id;
  const bookingId = cuerpo.booking_id;
  if ((transaccionId === undefined) === (bookingId === undefined)) throw new ApiError(400, "SOLICITUD_INVALIDA");

  // La consulta solo se atiende si la reserva es del viajero que llama.
  const reservaPropia = async (id: string) => {
    const [b] = await seleccionar(env, "bookings", `id=eq.${id}&select=id,codigo,estado,viajero_id`);
    if (!b) throw new ApiError(404, "RESERVA_NO_EXISTE");
    if (b.viajero_id !== usuario.id) throw new ApiError(403, "NO_ES_DUENO");
    return b;
  };

  let resultado: ResultadoPago | null = null;
  let tx: TransaccionWompi | null = null;
  let referencia: string | null = null;
  let reserva;

  if (transaccionId !== undefined) {
    if (typeof transaccionId !== "string" || !ID_TRANSACCION.test(transaccionId)) {
      throw new ApiError(400, "SOLICITUD_INVALIDA");
    }
    tx = await wompi.obtenerTransaccion(transaccionId);
    if (!tx) throw new ApiError(404, "TRANSACCION_NO_EXISTE");
    const [intento] = await seleccionar(
      env,
      "payment_attempts",
      `referencia=eq.${encodeURIComponent(tx.reference)}&select=booking_id`,
    );
    if (!intento) throw new ApiError(404, "REFERENCIA_DESCONOCIDA");
    reserva = await reservaPropia(intento.booking_id);
    resultado = await aplicarTransaccion(env, tx);
    referencia = tx.reference;
  } else {
    if (typeof bookingId !== "string" || !UUID.test(bookingId)) throw new ApiError(400, "SOLICITUD_INVALIDA");
    reserva = await reservaPropia(bookingId);
    const intentos = reserva.estado === "confirmada" ? [] : await seleccionar(
      env,
      "payment_attempts",
      `booking_id=eq.${bookingId}&order=created_at.desc&limit=5&select=referencia,wompi_transaction_id`,
    );
    referencia = intentos[0]?.referencia ?? null;
    // Del intento más nuevo al más viejo; si ninguno cierra la consulta, «pendiente» pesa más que «rechazado».
    busqueda:
    for (const intento of intentos) {
      const candidatas = intento.wompi_transaction_id
        ? [await wompi.obtenerTransaccion(intento.wompi_transaction_id)]
        : await wompi.buscarPorReferencia(intento.referencia);
      for (const candidata of candidatas) {
        if (!candidata) continue;
        const r = await aplicarTransaccion(env, candidata);
        const mejor = DEFINITIVOS.has(r.resultado) || !resultado ||
          (r.resultado === "pendiente" && resultado.resultado !== "pendiente");
        if (mejor) {
          resultado = r;
          tx = candidata;
          referencia = candidata.reference;
        }
        if (DEFINITIVOS.has(r.resultado)) break busqueda;
      }
    }
  }

  if (resultado === null) {
    // Reserva ya pagada, o Wompi todavía no conoce ninguna transacción de esta reserva.
    const [pago] = await seleccionar(
      env,
      "payments",
      `booking_id=eq.${reserva.id}&estado=in.(aprobado,reembolsado)&select=metodo,referencia&limit=1`,
    );
    return json(200, {
      estado_pago: pago ? "aprobado" : "pendiente",
      metodo: pago?.metodo ?? null,
      referencia: pago?.referencia ?? referencia,
      booking: { id: reserva.id, codigo: reserva.codigo, estado: reserva.estado },
    });
  }

  switch (resultado.resultado) {
    case "referencia_desconocida":
      throw new ApiError(404, "REFERENCIA_DESCONOCIDA");
    case "monto_no_coincide": {
      // Wompi cobró un monto o moneda distintos de los de la reserva: no se confirma y se devuelve lo cobrado.
      const reembolso = resultado.refund_id
        ? await procesarReembolso(env, wompi, resultado.refund_id)
        : (resultado.refund_estado ?? "no_aplica");
      throw new ApiError(409, "MONTO_NO_COINCIDE", { reembolso, referencia });
    }
    case "aprobado_tarde":
    case "ya_aprobado_tarde": {
      // El cobro llegó cuando la reserva ya no estaba disponible: se devuelve completo.
      const reembolso = resultado.refund_id
        ? await procesarReembolso(env, wompi, resultado.refund_id)
        : (resultado.refund_estado ?? "pendiente");
      throw new ApiError(409, "RESERVA_VENCIDA", { estado_pago: "aprobado_tarde", reembolso, referencia });
    }
  }

  const estadoPago = resultado.resultado === "confirmada" || resultado.resultado === "ya_confirmada"
    ? "aprobado"
    : resultado.resultado === "pendiente"
    ? "pendiente"
    : tx?.status === "ERROR"
    ? "error"
    : "rechazado";

  return json(200, {
    estado_pago: estadoPago,
    metodo: resultado.metodo ?? null,
    referencia: resultado.referencia ?? referencia,
    booking: { id: resultado.booking_id, codigo: resultado.booking_codigo, estado: resultado.booking_estado },
  });
}));
