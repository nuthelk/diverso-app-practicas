// pagos-iniciar — el viajero (JWT) pide pagar una reserva pendiente.
// Crea un intento de pago y devuelve la URL del Web Checkout de Wompi con la
// firma de integridad. Nunca pasa por aquí un dato de tarjeta: todo el medio de
// pago se elige en la página de Wompi.
//
// POST { booking_id, redirect_url } → 200 { checkout_url, referencia, amount_in_cents, expira_at }
import { ApiError, exigirPost, json, leerJson, manejar, UUID } from "../_shared/http.ts";
import { redirectPermitido } from "../_shared/config.ts";
import { contexto } from "../_shared/runtime.ts";
import { rpc, seleccionar, usuarioDesdeJwt } from "../_shared/db.ts";
import { construirCheckoutUrl, firmaIntegridad } from "../_shared/wompi.ts";

Deno.serve(manejar(async (req) => {
  exigirPost(req);
  const { cfg, env } = contexto();
  const usuario = await usuarioDesdeJwt(env, req);

  const cuerpo = await leerJson(req);
  const bookingId = cuerpo.booking_id;
  const redirectUrl = cuerpo.redirect_url;
  if (typeof bookingId !== "string" || !UUID.test(bookingId) || typeof redirectUrl !== "string") {
    throw new ApiError(400, "SOLICITUD_INVALIDA");
  }
  if (!redirectPermitido(redirectUrl, cfg.redirectPermitidos)) throw new ApiError(400, "REDIRECT_NO_PERMITIDO");

  const intento = await rpc(env, "crear_intento_pago", { p_booking_id: bookingId, p_viajero_id: usuario.id });

  const expiracion = new Date(intento.expira_at).toISOString();
  const firma = await firmaIntegridad(
    intento.referencia,
    intento.amount_in_cents,
    intento.moneda,
    expiracion,
    cfg.integritySecret,
  );
  const [perfil] = await seleccionar(env, "profiles", `id=eq.${usuario.id}&select=nombre`);

  return json(200, {
    checkout_url: construirCheckoutUrl(cfg, {
      referencia: intento.referencia,
      amountInCents: Number(intento.amount_in_cents),
      moneda: intento.moneda,
      firma,
      redirectUrl,
      expiracionIso: expiracion,
      email: usuario.email,
      nombre: perfil?.nombre,
    }),
    referencia: intento.referencia,
    amount_in_cents: Number(intento.amount_in_cents),
    expira_at: expiracion,
  });
}));
