/**
 * Supabase falso para probar la capa de datos sin red: registra en `rec` lo que el panel le manda.
 * Uso: `vi.mock('$lib/shared/api/supabase', () => import('$tests/supabase-falso'))` y `beforeEach(reiniciar)`.
 */

/** Registro de lo que el panel le manda a Supabase. */
export const rec = {
  insert: null as unknown,
  update: null as unknown,
  upsert: null as unknown,
  upsertOpciones: null as unknown,
  select: '' as string,
  eq: [] as [string, unknown][],
  tabla: '',
  rpc: [] as [string, unknown][],
  respuestaRpc: { data: null as unknown, error: null as unknown },
};

export function reiniciar(): void {
  rec.insert = rec.update = rec.upsert = rec.upsertOpciones = null;
  rec.select = '';
  rec.eq = [];
  rec.rpc = [];
  rec.tabla = '';
  rec.respuestaRpc = { data: null, error: null };
}

const cadena: Record<string, unknown> = {};
const resultado = () => Promise.resolve({ data: { id: 'plan-1' }, error: null });
cadena.insert = (fila: unknown) => {
  rec.insert = fila;
  return { select: () => ({ single: resultado }) };
};
cadena.update = (fila: unknown) => {
  rec.update = fila;
  return {
    eq: (col: string, val: unknown) => {
      rec.eq.push([col, val]);
      return Promise.resolve({ error: null });
    },
  };
};
cadena.select = (columnas: string) => {
  rec.select = columnas;
  return { eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) };
};
cadena.upsert = (fila: unknown, opciones: unknown) => {
  rec.upsert = fila;
  rec.upsertOpciones = opciones;
  return Promise.resolve({ error: null });
};

export const supabase = {
  from: (tabla: string) => {
    rec.tabla = tabla;
    return cadena;
  },
  rpc: (nombre: string, args: unknown) => {
    rec.rpc.push([nombre, args]);
    return Promise.resolve(rec.respuestaRpc);
  },
};
