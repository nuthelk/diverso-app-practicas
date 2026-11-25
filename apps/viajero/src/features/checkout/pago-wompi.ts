import { Platform } from 'react-native';

import { DiversoError, diversoConfig } from '@/core';
import { AppRoutes, decodificarComponenteQuery } from '@/router';

import { PagoAbierto } from './pago-abierto';

/**
 * Apertura del pago de Wompi, parte pura (`pago_wompi.dart`): URL de retorno, reconocimiento de la
 * redirección final en el WebView y la navegación en la misma pestaña en web. La parte con UI
 * (WebView modal) está en `components/PagoWompiModal.native.tsx` y el cableado en `useAbrirPago`.
 */

interface UrlPartida {
  scheme: string;
  host: string;
  path: string;
  query: string;
}

/**
 * `Uri.tryParse` mínimo (scheme, host, path y query), sin depender de `URL`: en Hermes
 * `URL.searchParams` no existe sin el polyfill, y aquí basta con comparar y leer `id`.
 */
function partir(url: string): UrlPartida | null {
  const m = /^([a-zA-Z][a-zA-Z0-9+.-]*):(?:\/\/([^/?#]*))?([^?#]*)(?:\?([^#]*))?(?:#.*)?$/.exec(url.trim());
  if (!m) return null;
  const autoridad = m[2] ?? '';
  // Sin usuario/clave ni puerto (`user:pass@host:443`).
  const host = autoridad.replace(/^.*@/, '').replace(/:\d*$/, '').toLowerCase();
  return { scheme: m[1]!.toLowerCase(), host, path: m[3] ?? '', query: m[4] ?? '' };
}

function parametroQuery(query: string, nombre: string): string | null {
  for (const par of query.split('&')) {
    const i = par.indexOf('=');
    const clave = decodificarComponenteQuery(i < 0 ? par : par.slice(0, i));
    if (clave === nombre) return decodificarComponenteQuery(i < 0 ? '' : par.slice(i + 1));
  }
  return null;
}

/**
 * URL a la que Wompi devuelve al viajero, según la plataforma:
 * - Web: `<origen de la app>/pago/resultado` (misma pestaña; el origen debe estar en
 *   `PAGOS_REDIRECT_ALLOWLIST` del backend: Expo web corre en http://localhost:8081, que NO está
 *   en la lista por defecto).
 * - Android/iOS: `https://diverso.app/pago/resultado`, interceptada por el WebView.
 */
export function urlRetornoPago({
  web = Platform.OS === 'web',
  origen = () => window.location.origin,
}: { web?: boolean; origen?: () => string } = {}): string {
  return web ? `${origen()}${AppRoutes.pagoResultado}` : diversoConfig.pagoRetornoMovil;
}

/** ¿Es [url] la redirección final de Wompi (`https://diverso.app/pago/resultado[?id=…]`)? */
export function esRedireccionDePago(url: string): boolean {
  const u = partir(url);
  const retorno = partir(diversoConfig.pagoRetornoMovil)!;
  return u !== null && u.scheme === retorno.scheme && u.host === retorno.host && u.path === retorno.path;
}

/** `id` de la transacción que Wompi añade a la redirección, o null si no viene. */
export function idDeRedireccion(url: string): string | null {
  const u = partir(url);
  const id = u === null ? null : parametroQuery(u.query, 'id');
  return id === null || id === '' ? null : id;
}

export type DecisionNavegacion = { tipo: 'retorno'; id: string | null } | { tipo: 'permitir' } | { tipo: 'bloquear' };

/**
 * Qué hace el WebView con cada navegación (`onNavigationRequest` de Dart): la redirección final
 * se intercepta y NO se carga (`retorno`); http/https/about se cargan; cualquier otro esquema
 * (intent://, nequi://…) se bloquea.
 */
export function decidirNavegacion(url: string): DecisionNavegacion {
  if (esRedireccionDePago(url)) return { tipo: 'retorno', id: idDeRedireccion(url) };
  const esquema = partir(url)?.scheme;
  return esquema === 'http' || esquema === 'https' || esquema === 'about' ? { tipo: 'permitir' } : { tipo: 'bloquear' };
}

/** Lleva ESTA pestaña a [url] (web). Dice si el navegador la aceptó. */
export function lanzarEnLaMismaVentana(url: string): boolean {
  if (typeof window === 'undefined' || typeof window.location?.assign !== 'function') return false;
  window.location.assign(url);
  return true;
}

/**
 * Web: lleva esta misma pestaña a [checkoutUrl]. [lanzar] abre la URL y dice si el navegador la
 * aceptó (se inyecta en las pruebas, que no tienen navegador).
 */
export async function abrirEnLaMismaVentana(
  checkoutUrl: string,
  lanzar: (url: string) => boolean = lanzarEnLaMismaVentana,
): Promise<PagoAbierto> {
  if (!lanzar(checkoutUrl)) throw new DiversoError('ERROR_NAVEGADOR', 'No se pudo abrir Wompi');
  return PagoAbierto.redirigido;
}

/** Props del WebView modal de Wompi (la versión web no pinta nada). */
export interface PagoWompiModalProps {
  /** URL del checkout abierto; null = modal cerrado. */
  checkoutUrl: string | null;
  /** Termina el pago: el id de la transacción al interceptar la redirección, o null si se cerró. */
  onTerminar: (transactionId: string | null) => void;
}
