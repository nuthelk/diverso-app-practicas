import { crearStore, useStore } from '@/shared/lib/store';

/**
 * Señal de «la agencia cambió» (p. ej. el logo en el perfil): el marco la escucha y vuelve a leer la agencia,
 * así el menú de cuenta se pone al día sin navegar. No guarda la agencia: cada quien la lee de la API.
 */
export const cambiosAgencia = crearStore({ version: 0 });

export function avisarCambioAgencia(): void {
  cambiosAgencia.set((previo) => ({ version: previo.version + 1 }));
}

/** La versión actual de la señal: úsala como dependencia del efecto que vuelve a leer la agencia. */
export function useCambiosAgencia() {
  return useStore(cambiosAgencia);
}
