// Configuración de Wompi y GUARDIA SOLO-PRUEBA.
//
// Regla del producto (S1): por ahora solo se opera en modo de prueba. Cada
// función llama a `cargarConfig` antes de hacer nada; si una sola llave no es
// de prueba o la URL de la API no es de sandbox, responde 503 SOLO_MODO_PRUEBA
// y no toca ni a Wompi ni a la base de datos. La respuesta nombra la variable
// que falla, nunca su valor.
import { ApiError } from "./http.ts";

export type LectorEnv = (nombre: string) => string | undefined;

export interface ConfigWompi {
  entorno: "sandbox" | "mock";
  apiUrl: string; // sin barra final, p. ej. https://sandbox.wompi.co/v1
  checkoutUrl: string;
  publicKey: string;
  privateKey: string;
  eventsSecret: string;
  integritySecret: string;
  redirectPermitidos: URL[];
}

const PREFIJOS: [string, string][] = [
  ["WOMPI_PUBLIC_KEY", "pub_test_"],
  ["WOMPI_PRIVATE_KEY", "prv_test_"],
  ["WOMPI_EVENTS_SECRET", "test_events_"],
  ["WOMPI_INTEGRITY_SECRET", "test_integrity_"],
];
const HOST_API_SANDBOX = "sandbox.wompi.co";
const HOST_CHECKOUT = "checkout.wompi.co";
const HOSTS_LOCALES = new Set(["localhost", "127.0.0.1", "host.docker.internal"]);

// Origen de la app web local y URL que intercepta el WebView (nunca se carga).
const REDIRECT_POR_DEFECTO =
  "http://localhost:8080/,http://127.0.0.1:8080/,http://localhost:3000/,http://127.0.0.1:3000/,https://diverso.app/pago/resultado";

function soloPrueba(detalle: string): never {
  throw new ApiError(503, "SOLO_MODO_PRUEBA", { detalle });
}

function url(valor: string | undefined, variable: string): URL {
  try {
    return new URL(valor ?? "");
  } catch {
    return soloPrueba(`${variable} no es una URL válida`);
  }
}

export function cargarConfig(leer: LectorEnv): ConfigWompi {
  const entorno = leer("WOMPI_ENV");
  if (entorno !== "sandbox" && entorno !== "mock") {
    soloPrueba("WOMPI_ENV debe ser «sandbox» (o «mock» para pruebas locales)");
  }
  for (const [variable, prefijo] of PREFIJOS) {
    const valor = leer(variable) ?? "";
    if (!valor.startsWith(prefijo) || valor.length <= prefijo.length) {
      soloPrueba(`${variable} no es una llave de prueba (debe empezar por ${prefijo})`);
    }
  }

  const api = url(leer("WOMPI_API_URL"), "WOMPI_API_URL");
  const checkout = url(leer("WOMPI_CHECKOUT_URL"), "WOMPI_CHECKOUT_URL");
  if (entorno === "sandbox") {
    if (api.protocol !== "https:" || api.hostname !== HOST_API_SANDBOX) {
      soloPrueba(`WOMPI_API_URL debe ser https://${HOST_API_SANDBOX}/…`);
    }
    if (checkout.protocol !== "https:" || checkout.hostname !== HOST_CHECKOUT) {
      soloPrueba(`WOMPI_CHECKOUT_URL debe ser https://${HOST_CHECKOUT}/…`);
    }
  } else {
    if (!HOSTS_LOCALES.has(api.hostname)) soloPrueba("con WOMPI_ENV=mock, WOMPI_API_URL debe ser un servidor local");
    if (!HOSTS_LOCALES.has(checkout.hostname)) {
      soloPrueba("con WOMPI_ENV=mock, WOMPI_CHECKOUT_URL debe ser un servidor local");
    }
  }

  // Una entrada mal escrita es un error de configuración (503), nunca un 500 ni una lista que deje pasar todo.
  const redirects = (leer("PAGOS_REDIRECT_ALLOWLIST") || REDIRECT_POR_DEFECTO)
    .split(",").map((s) => s.trim()).filter(Boolean)
    .map((s) => {
      const u = url(s, "PAGOS_REDIRECT_ALLOWLIST");
      if (u.protocol !== "http:" && u.protocol !== "https:") {
        soloPrueba("PAGOS_REDIRECT_ALLOWLIST solo admite URLs http(s)");
      }
      return u;
    });
  if (redirects.length === 0) soloPrueba("PAGOS_REDIRECT_ALLOWLIST no tiene ninguna URL");

  return {
    entorno,
    apiUrl: api.href.replace(/\/+$/, ""),
    checkoutUrl: checkout.href,
    publicKey: leer("WOMPI_PUBLIC_KEY")!,
    privateKey: leer("WOMPI_PRIVATE_KEY")!,
    eventsSecret: leer("WOMPI_EVENTS_SECRET")!,
    integritySecret: leer("WOMPI_INTEGRITY_SECRET")!,
    redirectPermitidos: redirects,
  };
}

/**
 * El retorno de Wompi solo puede ir a un origen permitido. Una entrada que termina en «/» (p. ej. el origen
 * completo) autoriza todo lo que cuelga de ella; una entrada con ruta exacta (p. ej. /pago/resultado) autoriza solo
 * esa ruta: la consulta (?id=…) y el fragmento no forman parte de la ruta, y /pago/resultadoEVIL no coincide.
 */
export function redirectPermitido(candidato: string, permitidos: URL[]): boolean {
  let u: URL;
  try {
    u = new URL(candidato);
  } catch {
    return false;
  }
  if (u.username || u.password) return false;
  return permitidos.some((p) =>
    p.origin === u.origin && (p.pathname.endsWith("/") ? u.pathname.startsWith(p.pathname) : u.pathname === p.pathname)
  );
}
