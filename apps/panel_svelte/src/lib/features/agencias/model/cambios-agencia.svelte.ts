/**
 * Señal de «la agencia cambió» (p. ej. el logo en el perfil): el marco la escucha y vuelve a leer la agencia,
 * así el menú de cuenta se pone al día sin navegar. No guarda la agencia: cada quien la lee de la API.
 */
export const cambiosAgencia = $state({ version: 0 });

export function avisarCambioAgencia(): void {
  cambiosAgencia.version++;
}
