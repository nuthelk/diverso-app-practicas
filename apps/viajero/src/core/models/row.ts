/**
 * Lectura de filas de PostgREST / respuestas JSON con las mismas reglas que los `fromMap` de Dart:
 * los números llegan como `num` (`(x as num).toDouble()` / `.toInt()`), y un valor `null` o ausente
 * toma el valor por defecto de cada modelo.
 */
export type Row = Record<string, unknown>;

/** Objeto JSON (no null ni lista): `x is Map` en Dart. */
export function isRow(v: unknown): v is Row {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export const asString = (v: unknown): string => v as string;

export const asStringOr = (v: unknown, fallback: string): string => (v == null ? fallback : (v as string));

export const asStringOrNull = (v: unknown): string | null => (v == null ? null : (v as string));

/** `(x as num).toInt()`: trunca hacia cero. */
export const asInt = (v: unknown): number => Math.trunc(Number(v));

export const asIntOr = (v: unknown, fallback: number): number => (v == null ? fallback : asInt(v));

/** `(x as num).toDouble()`. */
export const asDouble = (v: unknown): number => Number(v);

export const asDoubleOr = (v: unknown, fallback: number): number => (v == null ? fallback : Number(v));

export const asDoubleOrNull = (v: unknown): number | null => (v == null ? null : Number(v));

export const asBoolOr = (v: unknown, fallback: boolean): boolean => (v == null ? fallback : (v as boolean));

/** Lista de objetos JSON mapeada con [mapRow]; `[]` si no es lista (`x is List ? … : const []`). */
export function listOf<T>(v: unknown, mapRow: (f: Row) => T): T[] {
  return Array.isArray(v) ? v.map((e) => mapRow(e as Row)) : [];
}

/** Lista de textos; `[]` si falta. */
export function asStrings(v: unknown): string[] {
  return Array.isArray(v) ? v.map((e) => e as string) : [];
}
