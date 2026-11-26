import { ConsentState } from '@/features/legal/view-models/consent-view-model';

import { AppRoutes, encodeQueryComponent, decodeQueryComponent } from './routes';

/** Path y query de una ubicación interna (`/a/b?x=1#h`), sin depender del `URL` de React Native. */
function splitLocation(location: string): { path: string; query: string } {
  const withoutHash = location.split('#')[0] ?? '';
  const i = withoutHash.indexOf('?');
  return i < 0 ? { path: withoutHash, query: '' } : { path: withoutHash.slice(0, i), query: withoutHash.slice(i + 1) };
}

/** `uri.queryParameters[nombre]` de Dart (el primero, decodificado; `+` = espacio). */
function queryParam(query: string, name: string): string | null {
  for (const pair of query.split('&')) {
    if (pair === '') continue;
    const i = pair.indexOf('=');
    const key = decodeQueryComponent(i < 0 ? pair : pair.slice(0, i));
    if (key === name) return decodeQueryComponent(i < 0 ? '' : pair.slice(i + 1));
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
export function sessionRedirect({
  hasSession,
  consent,
  location,
}: {
  hasSession: boolean;
  consent: ConsentState;
  location: string;
}): string | null {
  const { path, query } = splitLocation(location);
  const atLegal = path.startsWith(AppRoutes.legalPrefix);
  const atLogin = path === AppRoutes.login;
  const atConsent = path === AppRoutes.consent;

  if (!hasSession) return atLogin || atLegal ? null : AppRoutes.login;
  if (atLegal) return null;

  if (consent === ConsentState.accepted) {
    if (atLogin) return AppRoutes.explore;
    if (atConsent) return safeDestination(queryParam(query, 'desde')) ?? AppRoutes.explore;
    return null;
  }
  return atConsent ? null : AppRoutes.consentFrom(location);
}

/**
 * [desde] si es una ubicación interna a la que se puede volver; null si no. Viene de la URL, así
 * que no se confía en ella: debe empezar por `/` (no `//` ni `/\`, que el navegador toma como otro
 * sitio), no llevar esquema ni autoridad, poder decodificarse, y no ser `/login` ni
 * `/consentimiento` (bucle).
 */
export function safeDestination(from: string | null | undefined): string | null {
  if (from == null || !from.startsWith('/') || from.startsWith('//')) return null;
  if (from.includes('\\')) return null;
  const { path, query } = splitLocation(from);
  // Empieza por «/» y no por «//»: no tiene esquema ni autoridad. Falta que «parsee».
  if (decodeQueryComponent(path) === null || decodeQueryComponent(query) === null) return null;
  if (path === AppRoutes.login || path === AppRoutes.consent) return null;
  return from;
}

/**
 * La ubicación de una pantalla del stack a partir de su nombre de ruta de Expo Router y sus
 * parámetros (`plan/[id]` + `{id: 'p1'}` → `/plan/p1`; grupos `(tabs)` e `index` no suman).
 */
export function routeLocation(routeName: string, params: Record<string, unknown> = {}): string {
  const segments = routeName
    .split('/')
    .filter((s) => s !== '' && s !== 'index' && !/^\(.*\)$/.test(s))
    .map((s) => {
      const dynamic = /^\[(?:\.\.\.)?(.+)\]$/.exec(s);
      if (!dynamic) return s;
      const value = params[dynamic[1]!];
      const text = Array.isArray(value) ? value.join('/') : String(value ?? '');
      return encodeQueryComponent(text);
    });
  return `/${segments.join('/')}`;
}

/**
 * Si una pantalla del stack puede montarse: es lo mismo que «el redirect no la sacaría de su
 * ubicación». Con Expo Router el guard no corre ANTES de construir la pantalla (como el `redirect`
 * de go_router), así que cada pantalla se monta solo si esto es `true`; mientras tanto el guard
 * navega al destino. Así una pantalla protegida no se monta ni carga datos mientras el
 * consentimiento se verifica, está pendiente o falló (gotcha 3), tampoco las que quedan debajo en
 * el stack.
 */
export function isScreenVisible({
  hasSession,
  consent,
  routeName,
  params,
}: {
  hasSession: boolean;
  consent: ConsentState;
  routeName: string;
  params?: Record<string, unknown>;
}): boolean {
  return sessionRedirect({ hasSession, consent, location: routeLocation(routeName, params) }) === null;
}
