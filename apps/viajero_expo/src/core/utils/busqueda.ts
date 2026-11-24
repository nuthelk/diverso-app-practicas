/**
 * Letras con tilde (en minúscula) y su letra base. Equivale al diccionario `unaccent` de
 * PostgreSQL para el español y lenguas vecinas.
 */
const SIN_TILDE: Record<string, string> = {
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

const TILDE = new RegExp(`[${Object.keys(SIN_TILDE).join('')}]`, 'g');
// `%` y `_` son comodines de ILIKE, `*` lo es en PostgREST y `\` escapa en ILIKE.
const COMODINES = /[%_*\\]/g;
const ESPACIOS = /\s+/g;

/**
 * Normaliza el texto del buscador igual que la columna `plans.busqueda` (migración 0011:
 * minúsculas y sin tildes), para poder compararlos con `ilike`: "Guatapé" → "guatape".
 * Los comodines que escriba el viajero (`% _ *` y `\`) se vuelven espacios para que se
 * busquen como texto y no como patrón; los espacios sobrantes se colapsan.
 */
export function normalizarBusqueda(texto: string): string {
  return texto
    .toLowerCase()
    .replace(TILDE, (c) => SIN_TILDE[c] ?? c)
    .replace(COMODINES, ' ')
    .replace(ESPACIOS, ' ')
    .trim();
}
