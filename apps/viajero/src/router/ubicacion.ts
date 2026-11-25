import { useGlobalSearchParams, usePathname, useSegments } from 'expo-router';

import { codificarComponenteQuery } from './rutas';

/**
 * Ubicación actual (ruta + query), lo que el guard necesita para el `?desde=` y la 404 muestra.
 * Se arma con hooks ESTABLES de Expo Router: `usePathname` da la ruta sin query y
 * `useGlobalSearchParams` mezcla parámetros de la ruta (`[bookingId]`) y de la query; los
 * segmentos dinámicos de `useSegments` dicen cuáles son de la ruta para no repetirlos.
 * (Reemplaza a `useUnstableGlobalHref`, que Expo Router marca `@private`.)
 */
export function armarUbicacion(
  pathname: string,
  segmentos: readonly string[],
  params: Readonly<Record<string, string | string[] | undefined>>,
): string {
  // `[id]`, `[...resto]` y `+not-found` (el catch-all interno de Expo Router, parámetro «not-found»).
  const deRuta = new Set(
    segmentos.map((s) => (s === '+not-found' ? 'not-found' : /^\[(?:\.\.\.)?([^\]]+)\]$/.exec(s)?.[1])).filter(Boolean),
  );
  const partes: string[] = [];
  for (const [clave, valor] of Object.entries(params)) {
    if (deRuta.has(clave) || valor === undefined) continue;
    for (const v of Array.isArray(valor) ? valor : [valor]) {
      partes.push(`${codificarComponenteQuery(clave)}=${codificarComponenteQuery(v)}`);
    }
  }
  return partes.length > 0 ? `${pathname}?${partes.join('&')}` : pathname;
}

export function useUbicacion(): string {
  return armarUbicacion(usePathname(), useSegments(), useGlobalSearchParams());
}
