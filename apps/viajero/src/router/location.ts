import { useGlobalSearchParams, usePathname, useSegments } from 'expo-router';

import { encodeQueryComponent } from './routes';

/**
 * Ubicación actual (ruta + query), lo que el guard necesita para el `?desde=` y la 404 muestra.
 * Se arma con hooks ESTABLES de Expo Router: `usePathname` da la ruta sin query y
 * `useGlobalSearchParams` mezcla parámetros de la ruta (`[bookingId]`) y de la query; los
 * segmentos dinámicos de `useSegments` dicen cuáles son de la ruta para no repetirlos.
 * (Reemplaza a `useUnstableGlobalHref`, que Expo Router marca `@private`.)
 */
export function buildLocation(
  pathname: string,
  segments: readonly string[],
  params: Readonly<Record<string, string | string[] | undefined>>,
): string {
  // `[id]`, `[...resto]` y `+not-found` (el catch-all interno de Expo Router, parámetro «not-found»).
  const routeParams = new Set(
    segments.map((s) => (s === '+not-found' ? 'not-found' : /^\[(?:\.\.\.)?([^\]]+)\]$/.exec(s)?.[1])).filter(Boolean),
  );
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (routeParams.has(key) || value === undefined) continue;
    for (const v of Array.isArray(value) ? value : [value]) {
      parts.push(`${encodeQueryComponent(key)}=${encodeQueryComponent(v)}`);
    }
  }
  return parts.length > 0 ? `${pathname}?${parts.join('&')}` : pathname;
}

export function useLocation(): string {
  return buildLocation(usePathname(), useSegments(), useGlobalSearchParams());
}
