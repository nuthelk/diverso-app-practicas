import { PostgrestError } from '@supabase/supabase-js';

import type { FunctionError } from './function-error';
import { userMessageFor } from './user-message';
import { isRow, type Row } from '../models/row';

/**
 * Códigos que las RPC elevan con `raise exception 'CODIGO'`, en el orden EXACTO en que Dart los
 * busca dentro del mensaje (el primero que aparezca gana).
 */
const KNOWN_CODES = [
  'SIN_CUPO',
  'PAX_INVALIDO',
  'NO_AUTENTICADO',
  'FECHA_NO_EXISTE',
  'PLAN_NO_PUBLICADO',
  'RESERVA_NO_EXISTE',
  'ESTADO_INVALIDO',
  'NO_ES_DUENO',
  'RESERVA_INVALIDA',
  'AGENCIA_NO_VERIFICADA',
  'AGENCIA_NO_HABILITADA',
  'FECHA_PASADA',
  'FECHA_YA_SALIO',
  'RESERVA_YA_SALIO',
  'RNT_VENCIDO',
] as const;

interface PlainPostgrestError {
  message: string;
  details?: unknown;
}

/**
 * `PostgrestError` lanzado por `.throwOnError()`, o el objeto plano `{message, code, details, hint}`
 * que supabase-js devuelve en `{ error }` sin `throwOnError`.
 */
function isPostgrestError(e: unknown): e is PlainPostgrestError {
  if (e instanceof PostgrestError) return true;
  return isRow(e) && !(e instanceof Error) && typeof e['message'] === 'string' && 'code' in e && 'details' in e;
}

/** Texto de un detalle cualquiera (`details?.toString()` de Dart). */
function asText(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === 'string') return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

/** Error de dominio con código estable para mostrar mensajes de la app (`DiversoException` de Dart). */
export class DiversoError extends Error {
  /** SIN_CUPO, ESTADO_INVALIDO, NO_ES_DUENO, … */
  readonly code: string;
  readonly rawMessage: string | null;
  /** Cuerpo completo del error de una Edge Function (p. ej. `estado_pago`, `reembolso`). */
  readonly details: Row | null;

  constructor(code: string, rawMessage: string | null = null, details: Row | null = null) {
    super(`DiversoError(${code}): ${rawMessage}`);
    this.name = 'DiversoError';
    this.code = code;
    this.rawMessage = rawMessage;
    this.details = details;
  }

  /** Pago aprobado por Wompi cuando la reserva ya había vencido: se reembolsa solo. */
  get approvedLate(): boolean {
    return this.details?.['estado_pago'] === 'aprobado_tarde';
  }

  /** Texto en español para el viajero (`mensajeUsuario` de Dart). */
  get userMessage(): string {
    return userMessageFor(this);
  }

  /**
   * Errores de las Edge Functions: `{error, mensaje, ...}` con HTTP 4xx/5xx. Orden de Dart:
   * 1) cuerpo con `error` de texto; 2) status 0 → SIN_CONEXION; 3) ≥ 500 → ERROR_SERVIDOR;
   * 4) ERROR_FUNCION.
   */
  static fromFunction(e: FunctionError): DiversoError {
    const d = e.details;
    if (isRow(d) && typeof d['error'] === 'string') {
      return new DiversoError(d['error'], typeof d['mensaje'] === 'string' ? d['mensaje'] : null, d);
    }
    if (e.status === 0) return new DiversoError('SIN_CONEXION', asText(d));
    if (e.status >= 500) return new DiversoError('ERROR_SERVIDOR', asText(d));
    return new DiversoError('ERROR_FUNCION', asText(d));
  }

  /**
   * Errores de PostgREST: las RPC elevan `raise exception 'CODIGO'` y PostgREST lo devuelve en
   * `message`. Lo que no es de PostgREST (red, bugs) sale como ERROR_INESPERADO.
   */
  static fromPostgrest(error: unknown): DiversoError {
    if (!isPostgrestError(error)) return new DiversoError('ERROR_INESPERADO', String(error));
    const msg = error.message.trim();
    // `raise exception 'RESERVA_PENDIENTE_EXISTENTE' using detail = <id de la reserva existente>`.
    if (msg.includes('RESERVA_PENDIENTE_EXISTENTE')) {
      const id = asText(error.details);
      return new DiversoError('RESERVA_PENDIENTE_EXISTENTE', msg, id === null || id === '' ? null : { booking_id: id });
    }
    for (const c of KNOWN_CODES) {
      if (msg.includes(c)) return new DiversoError(c, msg);
    }
    return new DiversoError('ERROR_BD', msg);
  }
}

export { userMessageFor };
