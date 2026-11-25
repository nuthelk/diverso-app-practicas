import type { Plan } from '@/core';

/**
 * El `extra` de go_router para `/comparar` (Expo Router no lo tiene): el catálogo deja aquí los
 * planes que ya tiene en memoria justo antes de navegar y el comparador los lee al montarse. Solo
 * evitan la espera: el comparador los usa únicamente si son EXACTAMENTE los ids de la URL y en el
 * mismo orden (gotcha 5); si no (recarga, deep link, otra selección), carga por id. Vive en
 * memoria: una recarga lo pierde, igual que el `extra`.
 */
let ultimos: readonly Plan[] | null = null;

export function dejarPlanesParaComparar(planes: readonly Plan[]): void {
  ultimos = planes;
}

export function planesParaComparar(): readonly Plan[] | null {
  return ultimos;
}

/** Para tests. */
export function olvidarPlanesParaComparar(): void {
  ultimos = null;
}
