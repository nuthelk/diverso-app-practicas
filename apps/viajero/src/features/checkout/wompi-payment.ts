import { Platform } from 'react-native';

import { DiversoError, diversoConfig } from '@/core';
import { AppRoutes, decodeQueryComponent } from '@/router';

import { PaymentOutcome } from './payment-outcome';

/**
 * Apertura del pago de Wompi, parte pura (`pago_wompi.dart`): URL de retorno, reconocimiento de la
 * redirección final en el WebView y la navegación en la misma pestaña en web. La parte con UI
 * (WebView modal) está en `components/WompiPaymentModal.native.tsx` y el cableado en `useOpenPayment`.
 */

interface ParsedUrl {
  scheme: string;
  host: string;
  path: string;
  query: string;
}

/**
 * `Uri.tryParse` mínimo (scheme, host, path y query), sin depender de `URL`: en Hermes
 * `URL.searchParams` no existe sin el polyfill, y aquí basta con comparar y leer `id`.
 */
function parseUrl(url: string): ParsedUrl | null {
  const m = /^([a-zA-Z][a-zA-Z0-9+.-]*):(?:\/\/([^/?#]*))?([^?#]*)(?:\?([^#]*))?(?:#.*)?$/.exec(url.trim());
  if (!m) return null;
  const authority = m[2] ?? '';
  // Sin usuario/clave ni puerto (`user:pass@host:443`).
  const host = authority.replace(/^.*@/, '').replace(/:\d*$/, '').toLowerCase();
  return { scheme: m[1]!.toLowerCase(), host, path: m[3] ?? '', query: m[4] ?? '' };
}

function queryParam(query: string, name: string): string | null {
  for (const pair of query.split('&')) {
    const i = pair.indexOf('=');
    const key = decodeQueryComponent(i < 0 ? pair : pair.slice(0, i));
    if (key === name) return decodeQueryComponent(i < 0 ? '' : pair.slice(i + 1));
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
export function paymentReturnUrl({
  web = Platform.OS === 'web',
  origin = () => window.location.origin,
}: { web?: boolean; origin?: () => string } = {}): string {
  return web ? `${origin()}${AppRoutes.paymentResult}` : diversoConfig.mobilePaymentReturnUrl;
}

/** ¿Es [url] la redirección final de Wompi (`https://diverso.app/pago/resultado[?id=…]`)? */
export function isPaymentRedirect(url: string): boolean {
  const u = parseUrl(url);
  const returnUrl = parseUrl(diversoConfig.mobilePaymentReturnUrl)!;
  return u !== null && u.scheme === returnUrl.scheme && u.host === returnUrl.host && u.path === returnUrl.path;
}

/** `id` de la transacción que Wompi añade a la redirección, o null si no viene. */
export function redirectTransactionId(url: string): string | null {
  const u = parseUrl(url);
  const id = u === null ? null : queryParam(u.query, 'id');
  return id === null || id === '' ? null : id;
}

export type NavigationDecision = { kind: 'retorno'; id: string | null } | { kind: 'permitir' } | { kind: 'bloquear' };

/**
 * Qué hace el WebView con cada navegación (`onNavigationRequest` de Dart): la redirección final
 * se intercepta y NO se carga (`retorno`); http/https/about se cargan; cualquier otro esquema
 * (intent://, nequi://…) se bloquea.
 */
export function decideNavigation(url: string): NavigationDecision {
  if (isPaymentRedirect(url)) return { kind: 'retorno', id: redirectTransactionId(url) };
  const scheme = parseUrl(url)?.scheme;
  return scheme === 'http' || scheme === 'https' || scheme === 'about' ? { kind: 'permitir' } : { kind: 'bloquear' };
}

/** Lleva ESTA pestaña a [url] (web). Dice si el navegador la aceptó. */
export function launchInSameWindow(url: string): boolean {
  if (typeof window === 'undefined' || typeof window.location?.assign !== 'function') return false;
  window.location.assign(url);
  return true;
}

/**
 * Web: lleva esta misma pestaña a [checkoutUrl]. [launch] abre la URL y dice si el navegador la
 * aceptó (se inyecta en las pruebas, que no tienen navegador).
 */
export async function openInSameWindow(
  checkoutUrl: string,
  launch: (url: string) => boolean = launchInSameWindow,
): Promise<PaymentOutcome> {
  if (!launch(checkoutUrl)) throw new DiversoError('ERROR_NAVEGADOR', 'No se pudo abrir Wompi');
  return PaymentOutcome.redirected;
}

/** Props del WebView modal de Wompi (la versión web no pinta nada). */
export interface WompiPaymentModalProps {
  /** URL del checkout abierto; null = modal cerrado. */
  checkoutUrl: string | null;
  /** Termina el pago: el id de la transacción al interceptar la redirección, o null si se cerró. */
  onFinish: (transactionId: string | null) => void;
}
