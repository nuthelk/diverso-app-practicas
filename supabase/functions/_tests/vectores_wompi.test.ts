// Vectores oficiales de la documentación de Wompi + la guardia solo-prueba.
// Corre sin Supabase ni red:
//   node --test supabase/functions/_tests/vectores_wompi.test.ts     (Node ≥ 22.18, type stripping)
//   deno test supabase/functions/_tests/vectores_wompi.test.ts       (también compatible)
import test from "node:test";
import assert from "node:assert/strict";
import { cargarConfig, redirectPermitido } from "../_shared/config.ts";
import { ApiError } from "../_shared/http.ts";
import {
  checksumEvento,
  construirCheckoutUrl,
  eventoAutentico,
  firmaIntegridad,
  igualesTiempoConstante,
  normalizarTransaccion,
} from "../_shared/wompi.ts";

// docs.wompi.co → Widget & Checkout Web → «Generar una firma de integridad».
const REF = "sk8-438k4-xmxm392-sn2m";
const SECRETO_INTEGRIDAD = "prod_integrity_Z5mMke9x0k8gpErbDqwrJXMqsI6SFli6";

test("firma de integridad: vector oficial sin expiración", async () => {
  assert.equal(
    await firmaIntegridad(REF, 2490000, "COP", undefined, SECRETO_INTEGRIDAD),
    "37c8407747e595535433ef8f6a811d853cd943046624a0ec04662b17bbf33bf5",
  );
});

test("firma de integridad: con expiration-time se concatena antes del secreto", async () => {
  // Cadena oficial de la documentación: sk8-438k4-xmxm392-sn2m2490000COP2023-06-09T20:28:50.000Zprod_integrity_…
  // La doc no imprime el hash de este caso: se calculó aparte con Python (hashlib.sha256(cadena).hexdigest()).
  assert.equal(
    await firmaIntegridad(REF, 2490000, "COP", "2023-06-09T20:28:50.000Z", SECRETO_INTEGRIDAD),
    "e972f58e7de36b283fbb93d9318d39a54ffdff4e8e917b534f30d63c9d7bb89c",
  );
});

// docs.wompi.co → Eventos → «Verifica la autenticidad de un evento».
// La cadena de la documentación es 1234-1610641025-49201APPROVED44900001530291411<secreto>.
// OJO: el checksum que imprime la documentación (3476DDA5…8BD0) NO es el SHA-256 de esa cadena
// (errata de la doc, verificado con Python y Node); el valor de abajo se calculó aparte con
// hashlib.sha256(cadena).hexdigest().upper() y fija el algoritmo para este vector.
const SECRETO_EVENTOS = "prod_events_OcHnIzeBl5socpwByQ4hA52Em3USQ93Z";
const CHECKSUM_VECTOR = "5A18EC5E8FDB7DF463E9F94774CBA8F583BA21BD04A09CEFF2EA68A4BC0AEFBE";
const eventoDoc = () => ({
  event: "transaction.updated",
  data: { transaction: { id: "1234-1610641025-49201", status: "APPROVED", amount_in_cents: 4490000 } },
  environment: "prod",
  signature: {
    properties: ["transaction.id", "transaction.status", "transaction.amount_in_cents"],
    checksum: CHECKSUM_VECTOR,
  },
  timestamp: 1530291411,
  sent_at: "2018-07-20T16:45:05.000Z",
});

test("checksum de evento: vector de la documentación (valores en el orden de properties + timestamp + secreto)", async () => {
  assert.equal(await checksumEvento(eventoDoc(), SECRETO_EVENTOS), CHECKSUM_VECTOR);
});

test("evento auténtico: acepta el checksum (también en minúsculas y vía cabecera) y rechaza alteraciones", async () => {
  assert.equal(await eventoAutentico(eventoDoc(), null, SECRETO_EVENTOS), true);
  assert.equal(await eventoAutentico(eventoDoc(), CHECKSUM_VECTOR.toLowerCase(), SECRETO_EVENTOS), true);
  const minuscula = eventoDoc();
  minuscula.signature.checksum = CHECKSUM_VECTOR.toLowerCase();
  assert.equal(await eventoAutentico(minuscula, null, SECRETO_EVENTOS), true);

  const otroMonto = eventoDoc();
  otroMonto.data.transaction.amount_in_cents = 1;
  assert.equal(await eventoAutentico(otroMonto, null, SECRETO_EVENTOS), false);
  const otroEstado = eventoDoc();
  otroEstado.data.transaction.status = "DECLINED";
  assert.equal(await eventoAutentico(otroEstado, null, SECRETO_EVENTOS), false);
  assert.equal(await eventoAutentico(eventoDoc(), null, "prod_events_otro"), false);
  assert.equal(await eventoAutentico(eventoDoc(), "0".repeat(64), SECRETO_EVENTOS), false, "cabecera distinta");
});

test("evento sin firma, sin timestamp o con properties inválidas no es auténtico", async () => {
  const sinFirma = eventoDoc() as Record<string, unknown>;
  delete sinFirma.signature;
  assert.equal(await eventoAutentico(sinFirma, null, SECRETO_EVENTOS), false);
  const sinTs = eventoDoc() as Record<string, unknown>;
  delete sinTs.timestamp;
  assert.equal(await eventoAutentico(sinTs, null, SECRETO_EVENTOS), false);
  const ruta = eventoDoc();
  ruta.signature.properties = ["transaction.id", "transaction.no_existe"];
  assert.equal(await eventoAutentico(ruta, null, SECRETO_EVENTOS), false);
  const raro = eventoDoc();
  raro.signature.properties = ["__proto__.constructor"];
  assert.equal(await eventoAutentico(raro, null, SECRETO_EVENTOS), false);
});

test("comparación en tiempo constante: ignora mayúsculas, exige igual longitud", () => {
  assert.equal(igualesTiempoConstante("ABCdef", "abcDEF"), true);
  assert.equal(igualesTiempoConstante("abc", "abcd"), false);
  assert.equal(igualesTiempoConstante("abc", "abd"), false);
});

// ---------------------------------------------------------------------------
// Guardia solo-prueba
// ---------------------------------------------------------------------------
const SANDBOX = {
  WOMPI_ENV: "sandbox",
  WOMPI_API_URL: "https://sandbox.wompi.co/v1",
  WOMPI_CHECKOUT_URL: "https://checkout.wompi.co/p/",
  WOMPI_PUBLIC_KEY: "pub_test_abc",
  WOMPI_PRIVATE_KEY: "prv_test_abc",
  WOMPI_EVENTS_SECRET: "test_events_abc",
  WOMPI_INTEGRITY_SECRET: "test_integrity_abc",
};
const MOCK = {
  ...SANDBOX,
  WOMPI_ENV: "mock",
  WOMPI_API_URL: "http://host.docker.internal:8765/v1",
  WOMPI_CHECKOUT_URL: "http://localhost:8765/p/",
};
const leer = (env: Record<string, string | undefined>) => (k: string) => env[k];

function rechazada(env: Record<string, string | undefined>): ApiError {
  try {
    cargarConfig(leer(env));
  } catch (e) {
    assert.ok(e instanceof ApiError);
    return e;
  }
  assert.fail("la guardia debía rechazar esta configuración");
}

test("guardia: sandbox y mock local válidos", () => {
  assert.equal(cargarConfig(leer(SANDBOX)).entorno, "sandbox");
  assert.equal(cargarConfig(leer(SANDBOX)).apiUrl, "https://sandbox.wompi.co/v1");
  assert.equal(cargarConfig(leer(MOCK)).entorno, "mock");
});

test("guardia: llaves de producción → 503 SOLO_MODO_PRUEBA sin revelar el valor", () => {
  const casos: [string, string][] = [
    ["WOMPI_PUBLIC_KEY", "pub_prod_Kw4aC0rZVgLZQn209NbEKPuXLzBD28Zx"],
    ["WOMPI_PRIVATE_KEY", "prv_prod_SECRETISIMA"],
    ["WOMPI_EVENTS_SECRET", "prod_events_SECRETISIMA"],
    ["WOMPI_INTEGRITY_SECRET", "prod_integrity_SECRETISIMA"],
    ["WOMPI_PRIVATE_KEY", "prv_test_"],
    ["WOMPI_PRIVATE_KEY", ""],
  ];
  for (const [variable, valor] of casos) {
    const e = rechazada({ ...SANDBOX, [variable]: valor });
    assert.equal(e.status, 503);
    assert.equal(e.code, "SOLO_MODO_PRUEBA");
    assert.ok(String(e.extra.detalle).includes(variable));
    assert.ok(!JSON.stringify(e.extra).includes("SECRETISIMA"), "no se filtra el valor de la llave");
  }
  assert.equal(rechazada({ ...SANDBOX, WOMPI_PUBLIC_KEY: undefined }).code, "SOLO_MODO_PRUEBA");
});

test("guardia: URL de producción o de otro host → 503", () => {
  for (
    const cambio of [
      { WOMPI_API_URL: "https://production.wompi.co/v1" },
      { WOMPI_API_URL: "http://sandbox.wompi.co/v1" },
      { WOMPI_API_URL: "https://sandbox.wompi.co.evil.com/v1" },
      { WOMPI_API_URL: "https://evil.com/v1" },
      { WOMPI_API_URL: "no es una url" },
      { WOMPI_API_URL: undefined },
      { WOMPI_CHECKOUT_URL: "https://checkout.wompi.co.evil.com/p/" },
      { WOMPI_CHECKOUT_URL: "http://checkout.wompi.co/p/" },
      { WOMPI_ENV: "production" },
      { WOMPI_ENV: undefined },
      { WOMPI_ENV: "sandbox", WOMPI_API_URL: "http://localhost:8765/v1" }, // el mock solo con WOMPI_ENV=mock
    ]
  ) {
    assert.equal(rechazada({ ...SANDBOX, ...cambio }).status, 503, JSON.stringify(cambio));
  }
  // WOMPI_ENV=mock tampoco abre la puerta a hosts remotos.
  assert.equal(rechazada({ ...MOCK, WOMPI_API_URL: "https://production.wompi.co/v1" }).status, 503);
  assert.equal(rechazada({ ...MOCK, WOMPI_API_URL: "https://sandbox.wompi.co/v1" }).status, 503);
  assert.equal(rechazada({ ...MOCK, WOMPI_CHECKOUT_URL: "https://checkout.wompi.co/p/" }).status, 503);
});

test("lista de retorno: solo orígenes permitidos (no por prefijo de texto)", () => {
  const cfg = cargarConfig(leer(SANDBOX));
  const ok = (u: string) => redirectPermitido(u, cfg.redirectPermitidos);
  assert.ok(ok("http://localhost:8080/pago/resultado"));
  assert.ok(ok("https://diverso.app/pago/resultado"));
  assert.ok(!ok("https://diverso.app/otra-ruta"));
  assert.ok(!ok("http://localhost:8080.evil.com/pago/resultado"));
  assert.ok(!ok("http://localhost:8080@evil.com/"));
  assert.ok(!ok("https://evil.com/pago/resultado"));
  assert.ok(!ok("javascript:alert(1)"));
  assert.ok(!ok("no es url"));
  const propia = cargarConfig(leer({ ...SANDBOX, PAGOS_REDIRECT_ALLOWLIST: "https://app.ejemplo.co/" }));
  assert.ok(redirectPermitido("https://app.ejemplo.co/x", propia.redirectPermitidos));
  assert.ok(!redirectPermitido("http://localhost:8080/", propia.redirectPermitidos));
});

test("lista de retorno: una ruta exacta no admite prefijos ni rutas hijas (frontera de ruta)", () => {
  const cfg = cargarConfig(leer(SANDBOX));
  const ok = (u: string) => redirectPermitido(u, cfg.redirectPermitidos);
  assert.ok(ok("https://diverso.app/pago/resultado"));
  assert.ok(ok("https://diverso.app/pago/resultado?id=123-456"), "Wompi agrega ?id=…");
  assert.ok(ok("https://diverso.app/pago/resultado#fragmento"));
  assert.ok(!ok("https://diverso.app/pago/resultadoEVIL"), "prefijo de texto, no frontera");
  assert.ok(!ok("https://diverso.app/pago/resultado-evil?x=1"));
  assert.ok(!ok("https://diverso.app/pago/resultado/extra"));
  assert.ok(!ok("https://diverso.app/pago/resultado/../otra"));
  assert.ok(!ok("https://diverso.app/pago/resultado%2Fextra"));
  // Una entrada que termina en «/» (todo el origen) sigue admitiendo cualquier ruta.
  assert.ok(ok("http://localhost:3000/pago/resultado"));
  assert.ok(ok("http://localhost:3000/cualquier/ruta?x=1"));
});

test("lista de retorno mal configurada → 503 SOLO_MODO_PRUEBA (no 500) sin revelar el valor", () => {
  for (
    const lista of [
      "no es una url",
      "http://localhost:8080/,%%%",
      "javascript:alert(1)",
      "ftp://diverso.app/pago",
      ",",
      "  ",
    ]
  ) {
    const e = rechazada({ ...SANDBOX, PAGOS_REDIRECT_ALLOWLIST: lista });
    assert.equal(e.status, 503, lista);
    assert.equal(e.code, "SOLO_MODO_PRUEBA", lista);
    assert.ok(!JSON.stringify(e.extra).includes(lista.trim() || "\u0000"), "el detalle nombra la variable, no su valor");
    assert.match(JSON.stringify(e.extra), /PAGOS_REDIRECT_ALLOWLIST/);
  }
  // Una lista vacía (variable sin definir o en blanco) usa la de por defecto.
  assert.ok(cargarConfig(leer({ ...SANDBOX, PAGOS_REDIRECT_ALLOWLIST: "" })).redirectPermitidos.length >= 1);
});

// ---------------------------------------------------------------------------
// URL del checkout y normalización
// ---------------------------------------------------------------------------
test("URL del checkout: parámetros de Wompi con la firma de integridad", async () => {
  const cfg = cargarConfig(leer(SANDBOX));
  const firma = await firmaIntegridad("DIV-1-1", 20000000, "COP", "2026-10-25T20:00:00.000Z", cfg.integritySecret);
  const u = new URL(construirCheckoutUrl(cfg, {
    referencia: "DIV-1-1",
    amountInCents: 20000000,
    moneda: "COP",
    firma,
    redirectUrl: "https://diverso.app/pago/resultado",
    expiracionIso: "2026-10-25T20:00:00.000Z",
    email: "a+b@ejemplo.co",
    nombre: "Ana Pérez",
  }));
  assert.equal(u.origin + u.pathname, "https://checkout.wompi.co/p/");
  assert.equal(u.searchParams.get("public-key"), "pub_test_abc");
  assert.equal(u.searchParams.get("currency"), "COP");
  assert.equal(u.searchParams.get("amount-in-cents"), "20000000");
  assert.equal(u.searchParams.get("reference"), "DIV-1-1");
  assert.equal(u.searchParams.get("signature:integrity"), firma);
  assert.equal(u.searchParams.get("redirect-url"), "https://diverso.app/pago/resultado");
  assert.equal(u.searchParams.get("expiration-time"), "2026-10-25T20:00:00.000Z");
  assert.equal(u.searchParams.get("customer-data:email"), "a+b@ejemplo.co");
  assert.equal(u.searchParams.get("customer-data:full-name"), "Ana Pérez");
});

test("normalizar transacción: solo los campos que se guardan", () => {
  const t = normalizarTransaccion({
    id: "1292-1602113476-10985",
    reference: "R",
    status: "APPROVED",
    amount_in_cents: 50000,
    currency: "COP",
    payment_method_type: "CARD",
    customer_email: "no-se-guarda@ejemplo.co",
    payment_method: { type: "CARD", extra: { last_four: "4242" } },
  });
  assert.deepEqual(Object.keys(t).sort(), [
    "amount_in_cents", "currency", "id", "payment_method_type", "reference", "status", "status_message",
  ]);
  assert.equal(t.status_message, null);
});
