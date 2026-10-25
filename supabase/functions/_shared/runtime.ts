// Único punto que toca `Deno` (el resto de _shared es portable y se prueba en Node).
import { cargarConfig, type ConfigWompi } from "./config.ts";
import { type EntornoSupabase, entornoSupabase } from "./db.ts";
import { WompiClient } from "./wompi.ts";

const leer = (nombre: string): string | undefined => Deno.env.get(nombre);

export interface Contexto {
  cfg: ConfigWompi;
  env: EntornoSupabase;
  wompi: WompiClient;
}

/** La guardia solo-prueba corre ANTES que cualquier otra cosa: 503 SOLO_MODO_PRUEBA si algo no es sandbox. */
export function contexto(): Contexto {
  const cfg = cargarConfig(leer);
  return { cfg, env: entornoSupabase(leer), wompi: new WompiClient(cfg) };
}
