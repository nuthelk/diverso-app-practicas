/**
 * Lectura de filas de PostgREST / respuestas JSON con las mismas reglas que los `fromMap` de Dart:
 * los números llegan como `num` (`(x as num).toDouble()` / `.toInt()`), y un valor `null` o ausente
 * toma el valor por defecto de cada modelo.
 */
export type Fila = Record<string, unknown>;

/** Objeto JSON (no null ni lista): `x is Map` en Dart. */
export function esFila(v: unknown): v is Fila {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export const texto = (v: unknown): string => v as string;

export const textoO = (v: unknown, porDefecto: string): string => (v == null ? porDefecto : (v as string));

export const textoONulo = (v: unknown): string | null => (v == null ? null : (v as string));

/** `(x as num).toInt()`: trunca hacia cero. */
export const entero = (v: unknown): number => Math.trunc(Number(v));

export const enteroO = (v: unknown, porDefecto: number): number => (v == null ? porDefecto : entero(v));

/** `(x as num).toDouble()`. */
export const decimal = (v: unknown): number => Number(v);

export const decimalO = (v: unknown, porDefecto: number): number => (v == null ? porDefecto : Number(v));

export const decimalONulo = (v: unknown): number | null => (v == null ? null : Number(v));

export const booleanoO = (v: unknown, porDefecto: boolean): boolean => (v == null ? porDefecto : (v as boolean));

/** Lista de objetos JSON mapeada con [desde]; `[]` si no es lista (`x is List ? … : const []`). */
export function listaDe<T>(v: unknown, desde: (f: Fila) => T): T[] {
  return Array.isArray(v) ? v.map((e) => desde(e as Fila)) : [];
}

/** Lista de textos; `[]` si falta. */
export function textos(v: unknown): string[] {
  return Array.isArray(v) ? v.map((e) => e as string) : [];
}
