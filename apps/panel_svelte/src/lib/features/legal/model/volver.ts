export type DestinoVolver = 'atras' | '/dashboard' | '/login';

/**
 * A dónde lleva «Volver» en un documento legal. Los enlaces de las autorizaciones abren el documento en una pestaña
 * nueva, que no tiene historial al que volver (`history.length` es 1): ahí se va al resumen con sesión o a iniciar
 * sesión sin ella.
 */
export function destinoVolver(historial: number, conSesion: boolean): DestinoVolver {
  if (historial > 1) return 'atras';
  return conSesion ? '/dashboard' : '/login';
}
