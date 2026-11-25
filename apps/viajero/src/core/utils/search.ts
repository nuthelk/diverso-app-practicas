/**
 * Letras con tilde (en minúscula) y su letra base. Equivale al diccionario `unaccent` de
 * PostgreSQL para el español y lenguas vecinas.
 */
const UNACCENTED: Record<string, string> = {
  á: 'a',
  à: 'a',
  â: 'a',
  ä: 'a',
  ã: 'a',
  å: 'a',
  é: 'e',
  è: 'e',
  ê: 'e',
  ë: 'e',
  í: 'i',
  ì: 'i',
  î: 'i',
  ï: 'i',
  ó: 'o',
  ò: 'o',
  ô: 'o',
  ö: 'o',
  õ: 'o',
  ú: 'u',
  ù: 'u',
  û: 'u',
  ü: 'u',
  ñ: 'n',
  ç: 'c',
  ý: 'y',
  ÿ: 'y',
};

const ACCENTED = new RegExp(`[${Object.keys(UNACCENTED).join('')}]`, 'g');
// `%` y `_` son comodines de ILIKE, `*` lo es en PostgREST y `\` escapa en ILIKE.
const WILDCARDS = /[%_*\\]/g;
const WHITESPACE = /\s+/g;

/**
 * Normaliza el texto del buscador igual que la columna `plans.busqueda` (migración 0011:
 * minúsculas y sin tildes), para poder compararlos con `ilike`: "Guatapé" → "guatape".
 * Los comodines que escriba el viajero (`% _ *` y `\`) se vuelven espacios para que se
 * busquen como texto y no como patrón; los espacios sobrantes se colapsan.
 */
export function normalizeSearch(text: string): string {
  return text
    .toLowerCase()
    .replace(ACCENTED, (c) => UNACCENTED[c] ?? c)
    .replace(WILDCARDS, ' ')
    .replace(WHITESPACE, ' ')
    .trim();
}
