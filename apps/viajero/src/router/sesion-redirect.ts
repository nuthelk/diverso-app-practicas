import { EstadoConsentimiento } from '@/features/legal/view-models/consent-view-model';

import { AppRoutes, codificarComponenteQuery, decodificarComponenteQuery } from './rutas';

/** Path y query de una ubicación interna (`/a/b?x=1#h`), sin depender del `URL` de React Native. */
function partir(ubicacion: string): { path: string; query: string } {
  const sinHash = ubicacion.split('#')[0] ?? '';
  const i = sinHash.indexOf('?');
  return i < 0 ? { path: sinHash, query: '' } : { path: sinHash.slice(0, i), query: sinHash.slice(i + 1) };
}

/** `uri.queryParameters[nombre]` de Dart (el primero, decodificado; `+` = espacio). */
function parametroDeQuery(query: string, nombre: string): string | null {
  for (const par of query.split('&')) {
    if (par === '') continue;
    const i = par.indexOf('=');
    const clave = decodificarComponenteQuery(i < 0 ? par : par.slice(0, i));
    if (clave === nombre) return decodificarComponenteQuery(i < 0 ? '' : par.slice(i + 1));
  }
  return null;
}

/**
 * Decide a dónde mandar al usuario según la sesión y el consentimiento (Ley 1581 de 2012).
 * Devuelve `null` si puede quedarse donde está. Es una función pura: el guard solo le pasa el
 * estado y la ubicación completa (con query). Port 1:1 de `sesion_redirect.dart`.
 *
 * Con sesión, mientras el consentimiento no esté **aceptado** (se está verificando, falta
 * aceptar, o la consulta falló y no se sabe) todo lleva a `/consentimiento?desde=<ubicación>`,
 * salvo los documentos legales: ninguna pantalla protegida se abre ni carga datos antes de
 * saberlo, y un fallo de red nunca deja entrar. Al quedar aceptado, quien está en
 * `/consentimiento` vuelve a `desde` (si es una ubicación interna segura) o al inicio.
 */
export function sesionRedirect({
  haySesion,
  consentimiento,
  ubicacion,
}: {
  haySesion: boolean;
  consentimiento: EstadoConsentimiento;
  ubicacion: string;
}): string | null {
  const { path, query } = partir(ubicacion);
  const enLegal = path.startsWith(AppRoutes.legalPrefijo);
  const enLogin = path === AppRoutes.login;
  const enConsentimiento = path === AppRoutes.consentimiento;

  if (!haySesion) return enLogin || enLegal ? null : AppRoutes.login;
  if (enLegal) return null;

  if (consentimiento === EstadoConsentimiento.aceptado) {
    if (enLogin) return AppRoutes.explorar;
    if (enConsentimiento) return destinoSeguro(parametroDeQuery(query, 'desde')) ?? AppRoutes.explorar;
    return null;
  }
  return enConsentimiento ? null : AppRoutes.consentimientoDesde(ubicacion);
}

/**
 * [desde] si es una ubicación interna a la que se puede volver; null si no. Viene de la URL, así
 * que no se confía en ella: debe empezar por `/` (no `//` ni `/\`, que el navegador toma como otro
 * sitio), no llevar esquema ni autoridad, poder decodificarse, y no ser `/login` ni
 * `/consentimiento` (bucle).
 */
export function destinoSeguro(desde: string | null | undefined): string | null {
  if (desde == null || !desde.startsWith('/') || desde.startsWith('//')) return null;
  if (desde.includes('\\')) return null;
  const { path, query } = partir(desde);
  // Empieza por «/» y no por «//»: no tiene esquema ni autoridad. Falta que «parsee».
  if (decodificarComponenteQuery(path) === null || decodificarComponenteQuery(query) === null) return null;
  if (path === AppRoutes.login || path === AppRoutes.consentimiento) return null;
  return desde;
}

/**
 * La ubicación de una pantalla del stack a partir de su nombre de ruta de Expo Router y sus
 * parámetros (`plan/[id]` + `{id: 'p1'}` → `/plan/p1`; grupos `(tabs)` e `index` no suman).
 */
export function ubicacionDeRuta(nombreRuta: string, params: Record<string, unknown> = {}): string {
  const segmentos = nombreRuta
    .split('/')
    .filter((s) => s !== '' && s !== 'index' && !/^\(.*\)$/.test(s))
    .map((s) => {
      const dinamico = /^\[(?:\.\.\.)?(.+)\]$/.exec(s);
      if (!dinamico) return s;
      const valor = params[dinamico[1]!];
      const texto = Array.isArray(valor) ? valor.join('/') : String(valor ?? '');
      return codificarComponenteQuery(texto);
    });
  return `/${segmentos.join('/')}`;
}

/**
 * Si una pantalla del stack puede montarse: es lo mismo que «el redirect no la sacaría de su
 * ubicación». Con Expo Router el guard no corre ANTES de construir la pantalla (como el `redirect`
 * de go_router), así que cada pantalla se monta solo si esto es `true`; mientras tanto el guard
 * navega al destino. Así una pantalla protegida no se monta ni carga datos mientras el
 * consentimiento se verifica, está pendiente o falló (gotcha 3), tampoco las que quedan debajo en
 * el stack.
 */
export function pantallaVisible({
  haySesion,
  consentimiento,
  nombreRuta,
  params,
}: {
  haySesion: boolean;
  consentimiento: EstadoConsentimiento;
  nombreRuta: string;
  params?: Record<string, unknown>;
}): boolean {
  return sesionRedirect({ haySesion, consentimiento, ubicacion: ubicacionDeRuta(nombreRuta, params) }) === null;
}
